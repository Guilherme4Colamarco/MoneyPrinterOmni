"""
Mascote Infortux e Assets 3D Low Poly (Blender Headless)
Fiel ao avatar oficial (avatar-final-800.png) e à estética low poly facetada
dos wallpapers do Ubuntu (Suru / Groovy Gorilla / Jammy Jellyfish).

Execução:
    blender -b --factory-startup --python-exit-code 1 -P scripts/build_infortux_pinguim_3d.py -- [--anim]
"""

import os
import sys
import math
import random
import shutil
import subprocess

user_site = os.path.expanduser("~/.local/lib/python3.14/site-packages")
if os.path.isdir(user_site) and user_site not in sys.path:
    sys.path.insert(0, user_site)

import bpy  # noqa: E402
import bmesh  # noqa: E402
from mathutils import Vector, Matrix  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "resource", "assets_3d", "infortux")
BRAIN_DIR = "/home/geko/.gemini/antigravity-cli/brain/a186d0fc-108e-4711-a087-26c2cb3dae42/infortux_3d"


# ---------------------------------------------------------------- Cores & Shaders
def srgb_to_lin(c: float) -> float:
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hexc(h: str) -> Vector:
    h = h.lstrip("#")
    return Vector([int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)])


def mix(a: Vector, b: Vector, t: float) -> Vector:
    t = max(0.0, min(1.0, t))
    return a.lerp(b, t)


def rgba(srgb: Vector, gain: float = 1.0) -> tuple:
    return tuple(srgb_to_lin(max(0.0, min(1.0, c * gain))) for c in srgb) + (1.0,)


PAL = {k: hexc(v) for k, v in {
    # Fundo Ubuntu Low Poly (brand-v4)
    "bg_red": "#B01B24",
    "bg_crimson": "#8A1139",
    "bg_magenta": "#63084B",
    "bg_purple": "#400356",
    "bg_deep": "#2B0B4C",
    "bg_night": "#1D0636",
    # Corpo do pinguim
    "body_top": "#6D4B76",
    "body_mid": "#4D2F5E",
    "body_dark": "#361D4C",
    "body_deep": "#26123B",
    # Máscara e peito (branco-lilás facetado)
    "mask_pure": "#FAF6F8",
    "mask_hi": "#F2EAEE",
    "mask_mid": "#E2D3DC",
    "mask_low": "#CDB9C9",
    "mask_shade": "#B69FB5",
    # Olhos
    "eye_sclera": "#F5EFF2",
    "eye_ring": "#E4D7DF",
    "eye_pupil": "#1A0F30",
    "eye_spark": "#FFFFFF",
    # Bico diamante 4 facetas
    "beak_ul": "#FBC543",
    "beak_ur": "#F39A27",
    "beak_ll": "#DF6818",
    "beak_lr": "#B43E0B",
    # Fone laranja e almofadas roxas
    "phone_bright": "#FF7630",
    "phone_main": "#F35A20",
    "phone_mid": "#DF4219",
    "phone_dark": "#B52318",
    "pad_light": "#6B4488",
    "pad_mid": "#4F2E6D",
    "pad_dark": "#34184E",
}.items()}


def get_emission_vertex_material(name: str = "Infortux_FlatFacet") -> bpy.types.Material:
    """
    Shader Emission controlado diretamente pelo atributo de cor por face ('Col').
    Garante que cada faceta tenha exatamente a cor e o contraste artístico da pintura
    low-poly do Ubuntu / avatar oficial, sem esbranquiçar nem lavar com reflexos.
    """
    mat = bpy.data.materials.get(name)
    if mat:
        return mat
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission")
    attr = nt.nodes.new("ShaderNodeAttribute")
    attr.attribute_name = "Col"
    nt.links.new(attr.outputs["Color"], em.inputs["Color"])
    nt.links.new(em.outputs["Emission"], out.inputs["Surface"])
    return mat


def get_lit_facet_material(name: str = "Infortux_LitFacet") -> bpy.types.Material:
    """
    Shader misto (70% cor pura da faceta + 30% sombreado difuso 3D) para que o modelo
    mantenha as cores exatas do avatar em qualquer ângulo e ainda reaja sutilmente à luz ao girar.
    """
    mat = bpy.data.materials.get(name)
    if mat:
        return mat
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    mix_sh = nt.nodes.new("ShaderNodeMixShader")
    mix_sh.inputs["Fac"].default_value = 0.25

    em = nt.nodes.new("ShaderNodeEmission")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value = 0.75
    bsdf.inputs["Specular IOR Level"].default_value = 0.1

    attr = nt.nodes.new("ShaderNodeAttribute")
    attr.attribute_name = "Col"

    nt.links.new(attr.outputs["Color"], em.inputs["Color"])
    nt.links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(em.outputs["Emission"], mix_sh.inputs[1])
    nt.links.new(bsdf.outputs["BSDF"], mix_sh.inputs[2])
    nt.links.new(mix_sh.outputs["Shader"], out.inputs["Surface"])
    return mat


def build_colored_mesh(name: str, verts: list, faces: list, parent=None, pure_emission: bool = False) -> bpy.types.Object:
    """
    Constrói um objeto Blender a partir de lista de vértices [(x,y,z), ...] e
    lista de faces [(indices_tuple, srgb_vector, gain), ...].
    Todas as faces são trianguladas ou mantidas planas com shading flat.
    """
    bm = bmesh.new()
    bm_verts = [bm.verts.new(v) for v in verts]
    bm.verts.ensure_lookup_table()

    face_colors = []
    for item in faces:
        idxs = item[0]
        col_vec = item[1]
        gain = item[2] if len(item) > 2 else 1.0
        try:
            f = bm.faces.new([bm_verts[i] for i in idxs])
            face_colors.append(rgba(col_vec, gain))
        except ValueError:
            pass

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()

    for poly in mesh.polygons:
        poly.use_smooth = False

    attr = mesh.color_attributes.new(name="Col", type="FLOAT_COLOR", domain="CORNER")
    for poly, col in zip(mesh.polygons, face_colors):
        for li in poly.loop_indices:
            attr.data[li].color = col

    mat = get_emission_vertex_material() if pure_emission else get_lit_facet_material()
    mesh.materials.append(mat)

    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    if parent:
        obj.parent = parent
    return obj


def make_empty(name: str, loc=(0, 0, 0), parent=None) -> bpy.types.Object:
    e = bpy.data.objects.new(name, None)
    e.location = loc
    bpy.context.scene.collection.objects.link(e)
    if parent:
        e.parent = parent
    return e


# ---------------------------------------------------------------- Fundo Ubuntu Suru / Groovy Low Poly
def build_ubuntu_suru_backdrop(width: float = 20.0, height: float = 20.0, y_depth: float = 4.5) -> bpy.types.Object:
    """
    Constrói o fundo low poly inspirado nos wallpapers oficiais do Ubuntu (Suru / 20.10 / 22.04):
    - Degradê vertical rico (#B01B24 topo -> #63084B meio -> #400356 -> #1D0636 base)
    - Grandes feixes diagonais simétricos em 'V' saindo do topo-esquerdo e topo-direito
    - Facetas triangulares amplas com variações sutis de luminância (±5%)
    """
    rng = random.Random(108)
    # Grade estruturada com linhas de dobra diagonais (estilo origami Ubuntu Suru)
    xs = [-1.0, -0.72, -0.46, -0.24, 0.0, 0.24, 0.46, 0.72, 1.0]
    zs = [-1.0, -0.76, -0.52, -0.26, 0.0, 0.26, 0.52, 0.76, 1.0]

    verts = []
    grid_idx = {}
    nx, nz = len(xs), len(zs)

    for iz, zn in enumerate(zs):
        for ix, xn in enumerate(xs):
            x = xn * (width * 0.5)
            z = zn * (height * 0.5)
            # Perturbação simétrica suave mantendo os feixes diagonais
            if 0 < ix < nx - 1 and 0 < iz < nz - 1:
                dx = math.sin(iz * 1.7 + abs(ix - 4) * 1.1) * (width * 0.022)
                dz = math.cos(ix * 1.3 + iz * 0.9) * (height * 0.022)
                if ix < 4:
                    x -= dx
                elif ix > 4:
                    x += dx
                z += dz
            grid_idx[(ix, iz)] = len(verts)
            verts.append((x, y_depth, z))

    def sample_bg(zn: float, xn: float, f_idx: int) -> tuple:
        t = (zn + 1.0) * 0.5  # 0 na base, 1 no topo
        if t > 0.78:
            base = mix(PAL["bg_crimson"], PAL["bg_red"], (t - 0.78) / 0.22)
        elif t > 0.52:
            base = mix(PAL["bg_magenta"], PAL["bg_crimson"], (t - 0.52) / 0.26)
        elif t > 0.25:
            base = mix(PAL["bg_purple"], PAL["bg_magenta"], (t - 0.25) / 0.27)
        else:
            base = mix(PAL["bg_night"], PAL["bg_purple"], t / 0.25)

        # Feixe cônico central iluminado (como no wallpaper do Ubuntu 20.10)
        cone_edge = 0.28 + 0.38 * t
        dist_x = abs(xn)
        if dist_x < cone_edge:
            gain = 1.07
        elif dist_x < cone_edge + 0.22:
            gain = 0.93
        else:
            gain = 1.00

        # Variação facetada discreta por triângulo
        facet_delta = ((f_idx * 37) % 11 - 5) * 0.011
        return base, gain + facet_delta

    faces = []
    f_count = 0
    for iz in range(nz - 1):
        for ix in range(nx - 1):
            a = grid_idx[(ix, iz)]
            b = grid_idx[(ix + 1, iz)]
            c = grid_idx[(ix + 1, iz + 1)]
            d = grid_idx[(ix, iz + 1)]

            # Diagonais convergindo para o centro (efeito raio Suru)
            if (ix < 4 and iz % 2 == 0) or (ix >= 4 and iz % 2 == 1):
                tris = [(a, b, c), (a, c, d)]
            else:
                tris = [(a, b, d), (b, c, d)]

            for tri in tris:
                cx = sum(verts[v][0] for v in tri) / (3.0 * width * 0.5)
                cz = sum(verts[v][2] for v in tri) / (3.0 * height * 0.5)
                col, gain = sample_bg(cz, cx, f_count)
                faces.append((tri, col, gain))
                f_count += 1

    obj = build_colored_mesh("Ubuntu_Suru_Backdrop", verts, faces, pure_emission=True)
    obj.visible_shadow = False
    return obj


# ---------------------------------------------------------------- Mascote Pinguim Low Poly (Fiel ao Avatar)
def build_infortux_penguin(root: bpy.types.Object):
    """
    Constrói o pinguim low poly com topologia simétrica espelhada fiel ao avatar-final-800.png:
    1. Corpo/Busto facetado com cabeça arredondada, ombros abertos e base terminando em ponta facetada.
    2. Máscara branca em coração nos olhos + peito claro facetado em triângulos grandes e limpos.
    3. Olhos grandes expressivos com aro branco, pupila roxo-noite e duplo brilho.
    4. Bico em diamante de 4 facetas (amarelo no topo, laranja na base).
    5. Fone laranja vibrante com almofadas roxas facetadas e arco superior com folga.
    """
    # --- 1. CORPO EXTERNO (Silhueta do Busto + Cabeça + Ombros) ---
    # Coordenadas (x >= 0, y, z) espelhadas para x < 0
    # Anéis de cima (topo da cabeça z=1.52) até a ponta inferior do busto (z=-1.68)
    ring_defs = [
        # z,   y_front, [(x0, y0), (x1, y1), ...] do centro (x=0) até a lateral/costas
        # Topo da cabeça
        (1.52, -0.10, [(0.00, -0.08), (0.32, -0.05), (0.52, 0.15)]),
        # Testa alta
        (1.26, -0.46, [(0.00, -0.48), (0.42, -0.40), (0.76, -0.15), (0.86, 0.25)]),
        # Linha das sobrancelhas + bico do "V" central da testa
        (0.92, -0.66, [(0.00, -0.68), (0.38, -0.64), (0.78, -0.44), (1.02, -0.08), (0.98, 0.35)]),
        # Linha dos olhos (z=0.52) — no centro o "V" da testa desce até (0.0, -0.74, 0.62)
        (0.55, -0.74, [(0.00, -0.72), (0.44, -0.70), (0.86, -0.52), (1.10, -0.10), (1.05, 0.38)]),
        # Linha das bochechas / bico (z=0.15)
        (0.15, -0.78, [(0.00, -0.76), (0.46, -0.72), (0.84, -0.52), (1.12, -0.08), (1.08, 0.40)]),
        # Pescoço / início dos ombros (z=-0.28)
        (-0.28, -0.82, [(0.00, -0.80), (0.48, -0.76), (0.88, -0.52), (1.28, -0.06), (1.18, 0.42)]),
        # Ombros largos / asas recolhidas (z=-0.78)
        (-0.78, -0.84, [(0.00, -0.82), (0.52, -0.78), (0.96, -0.52), (1.42, -0.04), (1.26, 0.42)]),
        # Base das asas (corte lateral do busto, z=-1.22)
        (-1.22, -0.78, [(0.00, -0.78), (0.48, -0.74), (0.88, -0.48), (1.32, 0.00), (1.10, 0.38)]),
        # Fechamento em V inferior do busto (z=-1.58)
        (-1.58, -0.55, [(0.00, -0.62), (0.38, -0.56), (0.65, -0.32), (0.72, 0.12)]),
    ]

    b_verts = []
    rings_L = []
    rings_R = []

    for z, _, pts in ring_defs:
        rL = []
        rR = []
        for idx, (x, y) in enumerate(pts):
            if idx == 0 and abs(x) < 1e-4:
                vi = len(b_verts)
                b_verts.append((0.0, y, z))
                rL.append(vi)
                rR.append(vi)
            else:
                vi_R = len(b_verts)
                b_verts.append((x, y, z))
                vi_L = len(b_verts)
                b_verts.append((-x, y, z))
                rR.append(vi_R)
                rL.append(vi_L)
        rings_R.append(rR)
        rings_L.append(rL)

    b_faces = []

    def body_shade(z_avg: float, x_abs: float, side_idx: int, r_idx: int) -> tuple:
        if z_avg > 1.1:
            col = mix(PAL["body_mid"], PAL["body_top"], (z_avg - 1.1) / 0.45)
        elif z_avg > 0.2:
            col = mix(PAL["body_dark"], PAL["body_mid"], (z_avg - 0.2) / 0.9)
        else:
            col = mix(PAL["body_deep"], PAL["body_dark"], max(0.0, (z_avg + 1.6) / 1.8))

        # Facetas de luz mais claras no topo-esquerdo, sombra à direita (como no avatar)
        gain = 1.0 + (0.06 if side_idx == 0 else -0.05) + ((r_idx % 2) * 0.04 - 0.02)
        if x_abs > 0.95:
            gain -= 0.06
        return col, gain

    for r in range(len(ring_defs) - 1):
        for side_flag, rings in ((0, rings_L), (1, rings_R)):
            top_r = rings[r]
            bot_r = rings[r + 1]
            n_seg = min(len(top_r), len(bot_r)) - 1
            for s in range(n_seg):
                u0, u1 = top_r[s], top_r[s + 1]
                v0, v1 = bot_r[s], bot_r[s + 1]
                z_avg = 0.5 * (ring_defs[r][0] + ring_defs[r + 1][0])
                x_abs = 0.5 * (abs(b_verts[u1][0]) + abs(b_verts[v1][0]))
                col1, g1 = body_shade(z_avg, x_abs, side_flag, r + s)
                col2, g2 = body_shade(z_avg - 0.08, x_abs, side_flag, r + s + 1)

                if side_flag == 1:
                    if u0 != v0:
                        b_faces.append(((u0, v0, v1), col1, g1))
                    b_faces.append(((u0, v1, u1), col2, g2))
                else:
                    if u0 != v0:
                        b_faces.append(((u0, v1, v0), col1, g1))
                    b_faces.append(((u0, u1, v1), col2, g2))

            # Se um anel tem 1 vértice extra na borda externa
            if len(bot_r) > len(top_r):
                u_last = top_r[-1]
                v_prev, v_last = bot_r[-2], bot_r[-1]
                col, g = body_shade(ring_defs[r + 1][0], 1.1, side_flag, r)
                tri = (u_last, v_prev, v_last) if side_flag == 1 else (u_last, v_last, v_prev)
                b_faces.append((tri, col, g))
            elif len(top_r) > len(bot_r):
                u_prev, u_last = top_r[-2], top_r[-1]
                v_last = bot_r[-1]
                col, g = body_shade(ring_defs[r][0], 1.1, side_flag, r)
                tri = (u_prev, v_last, u_last) if side_flag == 1 else (u_prev, u_last, v_last)
                b_faces.append((tri, col, g))

    build_colored_mesh("Pinguim_Corpo", b_verts, b_faces, parent=root)

    # --- 2. MÁSCARA BRANCA EM CORAÇÃO + PEITO FACETADO (Malha Dedicada com Bordas Limpas) ---
    # Vértices exatos desenhando os dois arcos sobre os olhos, o "V" da testa,
    # o recuo das bochechas e a barriga facetada até a ponta inferior.
    m_verts = [
        # 0: Ponta do "V" central da testa (entre os olhos)
        (0.00, -0.85, 0.62),
        # Arco sobrancelha direita (1..4) e esquerda (5..8)
        (0.24, -0.80, 0.94),   # 1: topo interno arco dir
        (0.54, -0.73, 0.96),   # 2: topo externo arco dir
        (0.78, -0.60, 0.72),   # 3: têmpora dir
        (0.76, -0.64, 0.34),   # 4: bochecha alta dir
        (-0.24, -0.80, 0.94),  # 5: topo interno arco esq
        (-0.54, -0.73, 0.96),  # 6: topo externo arco esq
        (-0.78, -0.60, 0.72),  # 7: têmpora esq
        (-0.76, -0.64, 0.34),  # 8: bochecha alta esq
        # Centro dos olhos / ponte nasal
        (0.36, -0.85, 0.56),   # 9: centro olho dir
        (-0.36, -0.85, 0.56),  # 10: centro olho esq
        (0.00, -0.90, 0.30),   # 11: topo do bico
        # Cintura da máscara (ao lado do bico, z=0.08)
        (0.60, -0.78, 0.06),   # 12: canto bochecha dir
        (-0.60, -0.78, 0.06),  # 13: canto bochecha esq
        (0.00, -0.92, -0.06),  # 14: base do bico
        # Peito superior (abre para baixo, z=-0.42)
        (0.34, -0.92, -0.38),  # 15: peito sup int dir
        (0.74, -0.72, -0.45),  # 16: peito sup ext dir
        (-0.34, -0.92, -0.38), # 17: peito sup int esq
        (-0.74, -0.72, -0.45), # 18: peito sup ext esq
        (0.00, -0.96, -0.52),  # 19: centro peito médio
        # Peito médio-baixo (z=-0.92)
        (0.42, -0.92, -0.90),  # 20: peito med int dir
        (0.84, -0.68, -0.92),  # 21: peito med ext dir
        (-0.42, -0.92, -0.90), # 22: peito med int esq
        (-0.84, -0.68, -0.92), # 23: peito med ext esq
        (0.00, -0.94, -1.08),  # 24: centro barriga baixa
        # Fechamento inferior da barriga (z=-1.38 .. -1.62)
        (0.68, -0.66, -1.35),  # 25: borda inf ext dir
        (0.32, -0.82, -1.48),  # 26: borda inf int dir
        (-0.68, -0.66, -1.35), # 27: borda inf ext esq
        (-0.32, -0.82, -1.48), # 28: borda inf int esq
        (0.00, -0.76, -1.62),  # 29: ponta inferior do escudo branco
    ]

    m_faces = [
        # Lóbulo Direito do Coração (ao redor do olho direito)
        ((0, 9, 1), PAL["mask_hi"], 1.00),
        ((1, 9, 2), PAL["mask_pure"], 1.02),
        ((2, 9, 3), PAL["mask_hi"], 0.98),
        ((3, 9, 4), PAL["mask_mid"], 0.97),
        ((0, 11, 9), PAL["mask_hi"], 1.00),
        ((9, 11, 12), PAL["mask_mid"], 0.98),
        ((9, 12, 4), PAL["mask_mid"], 0.95),

        # Lóbulo Esquerdo do Coração (ao redor do olho esquerdo)
        ((0, 5, 10), PAL["mask_pure"], 1.03),
        ((5, 6, 10), PAL["mask_pure"], 1.04),
        ((6, 7, 10), PAL["mask_hi"], 1.01),
        ((7, 8, 10), PAL["mask_hi"], 0.99),
        ((0, 10, 11), PAL["mask_pure"], 1.02),
        ((10, 13, 11), PAL["mask_hi"], 1.00),
        ((10, 8, 13), PAL["mask_mid"], 0.98),

        # Transição Bico -> Peito Superior
        ((11, 14, 12), PAL["mask_mid"], 0.96),
        ((11, 13, 14), PAL["mask_hi"], 1.01),
        ((14, 15, 12), PAL["mask_mid"], 0.97),
        ((12, 15, 16), PAL["mask_low"], 0.96),
        ((14, 13, 17), PAL["mask_pure"], 1.02),
        ((13, 18, 17), PAL["mask_hi"], 0.99),
        ((14, 19, 15), PAL["mask_mid"], 0.98),
        ((14, 17, 19), PAL["mask_hi"], 1.01),

        # Peito Médio (grandes triângulos facetados estilo origami)
        ((19, 20, 15), PAL["mask_mid"], 0.96),
        ((15, 20, 16), PAL["mask_low"], 0.95),
        ((16, 20, 21), PAL["mask_low"], 0.92),
        ((19, 17, 22), PAL["mask_hi"], 1.00),
        ((17, 18, 22), PAL["mask_mid"], 0.98),
        ((18, 23, 22), PAL["mask_mid"], 0.95),

        # Barriga Inferior
        ((19, 24, 20), PAL["mask_low"], 0.96),
        ((19, 22, 24), PAL["mask_mid"], 0.99),
        ((20, 24, 26), PAL["mask_low"], 0.93),
        ((20, 26, 25), PAL["mask_shade"], 0.94),
        ((20, 25, 21), PAL["mask_shade"], 0.90),
        ((22, 28, 24), PAL["mask_low"], 0.97),
        ((22, 27, 28), PAL["mask_low"], 0.94),
        ((22, 23, 27), PAL["mask_shade"], 0.93),

        # Ponta Inferior do Busto
        ((24, 29, 26), PAL["mask_shade"], 0.92),
        ((24, 28, 29), PAL["mask_low"], 0.95),
    ]

    build_colored_mesh("Pinguim_Mascara", m_verts, m_faces, parent=root)

    # --- 3. OLHOS GRANDES E EXPRESSIVOS (Esclera + Pupila + 2 Brilhos) ---
    eyes = []
    for sx, tag in ((-1, "E"), (1, "D")):
        ex, ey, ez = sx * 0.35, -0.87, 0.53
        grp = make_empty(f"Olho_{tag}", (ex, ey, ez), parent=root)
        # Inclinados levemente para acompanhar a curvatura do rosto
        grp.rotation_euler = (math.radians(4), math.radians(-sx * 8), 0.0)

        def make_disc(disc_name, rad_x, rad_z, y_off, z_off, x_off, n_seg, col_center, col_edge):
            dv = [(x_off, y_off - 0.005, z_off)]
            for i in range(n_seg):
                ang = 2.0 * math.pi * i / n_seg
                dv.append((x_off + rad_x * math.cos(ang), y_off, z_off + rad_z * math.sin(ang)))
            df = []
            for i in range(n_seg):
                i_next = 1 + ((i + 1) % n_seg)
                c = mix(col_center, col_edge, 0.12 if i % 2 == 0 else 0.0)
                df.append(((0, 1 + i, i_next), c, 1.0))
            return build_colored_mesh(disc_name, dv, df, parent=grp, pure_emission=True)

        # Aro claro da esclera (dá o olhar arregalado fofo do avatar)
        make_disc(f"Olho_Esclera_{tag}", 0.255, 0.275, 0.00, 0.00, 0.00, 16, PAL["eye_sclera"], PAL["eye_ring"])
        # Pupila grande roxo-noite
        make_disc(f"Olho_Pupila_{tag}", 0.180, 0.198, -0.015, -0.005, -sx * 0.01, 16, PAL["eye_pupil"], PAL["eye_pupil"])
        # Brilho principal (canto superior esquerdo)
        make_disc(f"Olho_Brilho1_{tag}", 0.055, 0.058, -0.030, 0.068, -0.055, 10, PAL["eye_spark"], PAL["eye_spark"])
        # Brilho secundário menor (canto inferior direito)
        make_disc(f"Olho_Brilho2_{tag}", 0.026, 0.026, -0.030, -0.065, 0.058, 8, PAL["eye_spark"], PAL["eye_spark"])
        eyes.append(grp)

    # --- 4. BICO EM DIAMANTE DE 4 FACETAS (Exatamente como no avatar) ---
    bk_verts = [
        (0.00, -1.14, 0.14),   # 0: Ponta central frontal do bico
        (0.00, -0.91, 0.33),   # 1: Topo do diamante
        (0.33, -0.89, 0.15),   # 2: Canto direito
        (0.00, -0.92, -0.05),  # 3: Base do diamante
        (-0.33, -0.89, 0.15),  # 4: Canto esquerdo
        (0.00, -0.82, 0.14),   # 5: Fechamento traseiro interno
    ]
    bk_faces = [
        # 4 facetas frontais visíveis
        ((0, 1, 4), PAL["beak_ul"], 1.02),  # Superior esquerda (amarelo-ouro claro)
        ((0, 2, 1), PAL["beak_ur"], 1.00),  # Superior direita (laranja-amarelo)
        ((0, 4, 3), PAL["beak_ll"], 0.98),  # Inferior esquerda (laranja médio)
        ((0, 3, 2), PAL["beak_lr"], 0.95),  # Inferior direita (laranja sombra)
        # Fechamento lateral interno
        ((5, 4, 1), PAL["beak_ul"], 0.90),
        ((5, 1, 2), PAL["beak_ur"], 0.90),
        ((5, 3, 4), PAL["beak_ll"], 0.85),
        ((5, 2, 3), PAL["beak_lr"], 0.85),
    ]
    build_colored_mesh("Pinguim_Bico", bk_verts, bk_faces, parent=root, pure_emission=True)

    # --- 5. FONES DE OUVIDO LARANJA E ALMOFADAS ROXAS ---
    phones = make_empty("Fone_Grupo", (0, 0, 0), parent=root)

    for sx, tag in ((-1, "E"), (1, "D")):
        # Almofada roxa vertical encostada na lateral da cabeça (z central = 0.50)
        zc = 0.50
        x_in = sx * 0.95
        x_mid = sx * 1.13
        x_out = sx * 1.32

        pad_v = []
        n_ring = 10
        # Anel interno (encostado na cabeça), anel médio da almofada, anel externo da concha
        for x_val, rx_s, ry, rz in (
            (x_in, 0.0, 0.28, 0.38),
            (x_mid, 0.0, 0.30, 0.40),
            (x_mid + sx * 0.03, 0.0, 0.27, 0.36),
            (x_out, 0.0, 0.24, 0.32),
            (x_out + sx * 0.08, 0.0, 0.14, 0.20),
        ):
            for i in range(n_ring):
                ang = 2.0 * math.pi * i / n_ring
                pad_v.append((x_val, -0.18 + ry * math.cos(ang), zc + rz * math.sin(ang)))

        # Centro da tampa externa da concha laranja
        cap_idx = len(pad_v)
        pad_v.append((x_out + sx * 0.11, -0.18, zc))

        pad_f = []
        # Anel 0->1: Almofada roxa (#6B4488 no topo -> #34184E na base)
        for i in range(n_ring):
            inext = (i + 1) % n_ring
            a, b = i, inext
            c, d = n_ring + inext, n_ring + i
            z_norm = math.sin(2.0 * math.pi * (i + 0.5) / n_ring)
            p_col = PAL["pad_light"] if z_norm > 0.2 else (PAL["pad_mid"] if z_norm > -0.3 else PAL["pad_dark"])
            gain = 1.04 if (i % 2 == 0) else 0.96
            if sx == 1:
                pad_f.append(((a, b, c), p_col, gain))
                pad_f.append(((a, c, d), p_col, gain * 0.96))
            else:
                pad_f.append(((a, c, b), p_col, gain))
                pad_f.append(((a, d, c), p_col, gain * 0.96))

        # Anéis 2->3->4 + tampa: Concha Laranja Facetada (#FF7630 -> #F35A20 -> #B52318)
        for r_base in (2 * n_ring, 3 * n_ring):
            for i in range(n_ring):
                inext = (i + 1) % n_ring
                a, b = r_base + i, r_base + inext
                c, d = r_base + n_ring + inext, r_base + n_ring + i
                z_norm = math.sin(2.0 * math.pi * (i + 0.5) / n_ring)
                c_col = PAL["phone_bright"] if z_norm > 0.25 else (PAL["phone_main"] if z_norm > -0.25 else PAL["phone_dark"])
                gain = 1.05 if (i % 2 == 0) else 0.95
                if sx == 1:
                    pad_f.append(((a, b, c), c_col, gain))
                    pad_f.append(((a, c, d), c_col, gain * 0.95))
                else:
                    pad_f.append(((a, c, b), c_col, gain))
                    pad_f.append(((a, d, c), c_col, gain * 0.95))

        # Tampa facetada da concha laranja
        r_last = 4 * n_ring
        for i in range(n_ring):
            inext = (i + 1) % n_ring
            a, b = r_last + i, r_last + inext
            z_norm = math.sin(2.0 * math.pi * (i + 0.5) / n_ring)
            c_col = PAL["phone_bright"] if z_norm > 0.1 else (PAL["phone_main"] if z_norm > -0.3 else PAL["phone_mid"])
            tri = (a, b, cap_idx) if sx == 1 else (a, cap_idx, b)
            pad_f.append((tri, c_col, 1.02 if i % 2 == 0 else 0.96))

        build_colored_mesh(f"Fone_Concha_{tag}", pad_v, pad_f, parent=phones, pure_emission=True)

    # Arco superior do fone (Headband) arqueando sobre a cabeça com folga elegante
    hb_verts = []
    hb_faces = []
    n_arc = 14
    n_sec = 6
    x_span = 1.15
    z_start = 0.82
    z_arch = 0.94  # sobe até z ≈ 1.76 (acima do topo da cabeça z=1.52)

    for i in range(n_arc + 1):
        theta = math.pi * i / n_arc  # 0 (direita) .. pi (esquerda)
        cx = x_span * math.cos(theta)
        cz = z_start + z_arch * math.sin(theta)
        cy = -0.16

        # Vetor radial no plano XZ
        rx, rz = math.cos(theta), math.sin(theta)
        for j in range(n_sec):
            phi = 2.0 * math.pi * j / n_sec
            # Seção achatada estilosa
            r_rad = 0.085 * math.cos(phi)
            r_y = 0.14 * math.sin(phi)
            hb_verts.append((cx + rx * r_rad, cy + r_y, cz + rz * r_rad))

    for i in range(n_arc):
        for j in range(n_sec):
            jn = (j + 1) % n_sec
            a = i * n_sec + j
            b = i * n_sec + jn
            c = (i + 1) * n_sec + jn
            d = (i + 1) * n_sec + j

            # Face externa/frontal do arco é laranja vivo; face interna inferior é vermelho-sombra (#B52318)
            phi_mid = 2.0 * math.pi * (j + 0.5) / n_sec
            if math.cos(phi_mid) < -0.2:
                col = PAL["phone_dark"]
            elif math.sin(phi_mid) < 0.0 and math.cos(phi_mid) > 0.2:
                col = PAL["phone_bright"]
            else:
                col = PAL["phone_main"]

            gain = 1.03 if ((i + j) % 2 == 0) else 0.97
            hb_faces.append(((a, b, c), col, gain))
            hb_faces.append(((a, c, d), col, gain * 0.98))

    build_colored_mesh("Fone_Arco", hb_verts, hb_faces, parent=phones, pure_emission=True)
    return eyes, phones


# ---------------------------------------------------------------- Iluminação, Câmeras e Animação
def setup_scene_and_lights():
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"

    world = bpy.data.worlds.new("InfortuxWorld")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = rgba(PAL["bg_purple"])
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.85
    scene.world = world

    def add_light(name, energy, color, loc, size=3.5):
        ld = bpy.data.lights.new(name, "AREA")
        ld.energy = energy
        ld.color = color
        ld.size = size
        lo = bpy.data.objects.new(name, ld)
        lo.location = loc
        scene.collection.objects.link(lo)
        direction = Vector((0, 0, 0.0)) - Vector(loc)
        lo.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()

    add_light("KeyLight", 350, (1.0, 0.96, 0.92), (-3.0, -4.2, 3.2), size=4.0)
    add_light("FillLight", 180, (0.85, 0.70, 1.0), (3.5, -3.5, 0.5), size=4.5)
    add_light("RimLight", 420, (1.0, 0.50, 0.22), (0.0, 2.8, 3.2), size=3.0)


def make_camera(name: str, loc: tuple, target: tuple, lens: float = 55.0) -> bpy.types.Object:
    cd = bpy.data.cameras.new(name)
    cd.lens = lens
    co = bpy.data.objects.new(name, cd)
    co.location = loc
    bpy.context.scene.collection.objects.link(co)
    direction = Vector(target) - Vector(loc)
    co.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    return co


def render_png(cam: bpy.types.Object, filepath: str, w: int, h: int, samples: int = 16):
    scene = bpy.context.scene
    scene.camera = cam
    scene.render.resolution_x = w
    scene.render.resolution_y = h
    scene.render.resolution_percentage = 100
    if hasattr(scene.eevee, "taa_render_samples"):
        scene.eevee.taa_render_samples = samples
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = filepath
    bpy.ops.render.render(write_still=True)
    print(f"  [+] Render salvo: {filepath}")
    if os.path.isdir(BRAIN_DIR):
        shutil.copy2(filepath, os.path.join(BRAIN_DIR, os.path.basename(filepath)))


def animate_penguin_idle(root: bpy.types.Object, eyes: list, phones: bpy.types.Object, frames: int = 90):
    """
    Animação viva do canal Infortux (3 segundos a 30fps):
    - Balanço suave de 2.5° e giro sutil de curiosidade
    - Piscada dupla natural dos olhos
    - Pulso do fone laranja (1.0 -> 1.08 -> 1.0) quando surge uma ideia
    """
    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = frames
    scene.render.fps = 30

    for f in range(1, frames + 1, 5):
        t = (f - 1) / frames * (2.0 * math.pi)
        root.rotation_euler = (
            math.radians(1.5) * math.cos(t),
            math.radians(3.0) * math.sin(t),
            math.radians(10.0) * math.sin(t),
        )
        root.location = (0.0, 0.0, 0.035 * math.sin(2.0 * t))
        root.keyframe_insert("rotation_euler", frame=f)
        root.keyframe_insert("location", frame=f)

    # Piscada no frame 28 e no frame 72
    for e in eyes:
        for f, sz in ((1, 1.0), (25, 1.0), (28, 0.08), (31, 1.0), (69, 1.0), (72, 0.08), (75, 1.0), (frames, 1.0)):
            e.scale = (1.0, 1.0, sz)
            e.keyframe_insert("scale", frame=f)

    # Pulso do fone laranja no frame 48
    for f, sc in ((1, 1.0), (44, 1.0), (49, 1.08), (55, 1.0), (frames, 1.0)):
        phones.scale = (sc, sc, sc)
        phones.keyframe_insert("scale", frame=f)


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    do_anim = "--anim" in argv

    for sub in ("models", "renders", "demos"):
        os.makedirs(os.path.join(OUT, sub), exist_ok=True)
    os.makedirs(BRAIN_DIR, exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    setup_scene_and_lights()

    root = make_empty("Infortux_Pinguim")
    eyes, phones = build_infortux_penguin(root)

    # Exporta GLB do mascote
    bpy.ops.object.select_all(action="DESELECT")
    for o in [root] + list(root.children_recursive):
        o.select_set(True)
    glb_path = os.path.join(OUT, "models", "infortux_pinguim.glb")
    bpy.ops.export_scene.gltf(filepath=glb_path, export_format="GLB", use_selection=True)
    # Atualiza também o nome antigo para não sobrar o arquivo feio
    shutil.copy2(glb_path, os.path.join(OUT, "models", "infortux_mascote_tux.glb"))
    print(f"  [+] GLB exportado: {glb_path}")

    # Constrói o fundo oficial estilo Ubuntu Suru Low Poly
    build_ubuntu_suru_backdrop(width=18.0, height=22.0, y_depth=4.2)

    cam_front = make_camera("Cam_Frente", (0.0, -5.8, 0.05), (0.0, 0.0, 0.05), lens=55.0)
    cam_34 = make_camera("Cam_34", (-2.2, -5.4, 0.35), (0.0, 0.0, 0.05), lens=55.0)
    cam_shorts = make_camera("Cam_Shorts", (0.0, -8.5, 0.15), (0.0, 0.0, 0.15), lens=50.0)

    r_dir = os.path.join(OUT, "renders")
    frente_png = os.path.join(r_dir, "infortux_pinguim_frente.png")
    render_png(cam_front, frente_png, 1080, 1080)
    # Sobrescreve também o preview antigo para que tudo na pasta renders fique bonito
    shutil.copy2(frente_png, os.path.join(r_dir, "infortux_mascote_tux_preview.png"))
    shutil.copy2(frente_png, os.path.join(BRAIN_DIR, "infortux_mascote_tux_preview.png"))

    render_png(cam_34, os.path.join(r_dir, "infortux_pinguim_34.png"), 1080, 1080)
    render_png(cam_shorts, os.path.join(r_dir, "infortux_pinguim_shorts.png"), 1080, 1920)

    blend_path = os.path.join(OUT, "models", "infortux_pinguim.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    shutil.copy2(blend_path, os.path.join(OUT, "models", "infortux_mascote_tux.blend"))

    if do_anim:
        animate_penguin_idle(root, eyes, phones, frames=90)
        bpy.ops.wm.save_as_mainfile(filepath=blend_path)
        tmp_dir = "/tmp/infortux_pinguim_anim"
        shutil.rmtree(tmp_dir, ignore_errors=True)
        os.makedirs(tmp_dir, exist_ok=True)

        scene = bpy.context.scene
        scene.camera = cam_front
        scene.render.resolution_x = 720
        scene.render.resolution_y = 720
        if hasattr(scene.eevee, "taa_render_samples"):
            scene.eevee.taa_render_samples = 8
        scene.render.filepath = os.path.join(tmp_dir, "f_")
        bpy.ops.render.render(animation=True)

        mp4_path = os.path.join(OUT, "demos", "infortux_pinguim_idle.mp4")
        subprocess.run([
            "ffmpeg", "-y", "-loglevel", "error", "-framerate", "30",
            "-i", os.path.join(tmp_dir, "f_%04d.png"),
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", mp4_path
        ], check=True)
        shutil.rmtree(tmp_dir, ignore_errors=True)
        shutil.copy2(mp4_path, os.path.join(OUT, "demos", "infortux_mascote_tux_demo.mp4"))
        shutil.copy2(mp4_path, os.path.join(BRAIN_DIR, "infortux_pinguim_idle.mp4"))
        print(f"  [+] Vídeo animado salvo: {mp4_path}")


if __name__ == "__main__":
    main()
