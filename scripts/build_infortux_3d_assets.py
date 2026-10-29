"""
Gerador dos Objetos Didáticos 3D Low Poly do Canal Infortux (CPU Chip, Terminal, Pacote de Rede)
com fundo low poly inspirado nos wallpapers do Ubuntu (Suru / Groovy Gorilla / Jammy Jellyfish).

Execução:
    blender -b --factory-startup --python-exit-code 1 -P scripts/build_infortux_3d_assets.py
"""

import os
import sys
import math
import shutil
import subprocess

user_site = os.path.expanduser("~/.local/lib/python3.14/site-packages")
if os.path.isdir(user_site) and user_site not in sys.path:
    sys.path.insert(0, user_site)

sys.path.insert(0, os.path.dirname(__file__))

import bpy  # noqa: E402
import bmesh  # noqa: E402
from mathutils import Vector, Matrix  # noqa: E402

from build_infortux_pinguim_3d import (  # noqa: E402
    PAL,
    OUT,
    BRAIN_DIR,
    rgba,
    mix,
    hexc,
    build_ubuntu_suru_backdrop,
    setup_scene_and_lights,
    make_camera,
    render_png,
)


def make_facet_mat(name: str, col_srgb: Vector, emit: float = 0.25, rough: float = 0.55, metal: float = 0.1) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    mix_sh = nt.nodes.new("ShaderNodeMixShader")
    mix_sh.inputs["Fac"].default_value = 1.0 - emit

    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = rgba(col_srgb)

    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = rgba(col_srgb)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal

    nt.links.new(em.outputs["Emission"], mix_sh.inputs[1])
    nt.links.new(bsdf.outputs["BSDF"], mix_sh.inputs[2])
    nt.links.new(mix_sh.outputs["Shader"], out.inputs["Surface"])
    return mat


def add_prism_box(bm: bmesh.types.BMesh, size_xyz: tuple, loc_xyz: tuple, mat_idx: int, chamfer: float = 0.04):
    ret = bmesh.ops.create_cube(bm, size=1.0)
    verts = ret["verts"]
    bmesh.ops.scale(bm, verts=verts, vec=size_xyz)
    bmesh.ops.translate(bm, verts=verts, vec=loc_xyz)
    faces = list({f for v in verts for f in v.link_faces})
    for f in faces:
        f.material_index = mat_idx
        f.smooth = False
    if chamfer > 0.0:
        edges = list({e for f in faces for e in f.edges})
        b_ret = bmesh.ops.bevel(bm, geom=edges, offset=chamfer, segments=1, affect="EDGES")
        for f in b_ret.get("faces", []):
            f.material_index = mat_idx
            f.smooth = False


def build_cpu_chip() -> bpy.types.Object:
    """CPU / Processador Low Poly estilizado na paleta Infortux."""
    mesh = bpy.data.meshes.new("Infortux_CPU_Chip_Mesh")
    bm = bmesh.new()

    # 0: Substrato roxo-escuro chanfrado
    add_prism_box(bm, (2.2, 2.2, 0.24), (0, 0, 0), mat_idx=0, chamfer=0.08)
    # 1: Moldura intermediária roxo-claro
    add_prism_box(bm, (1.55, 1.55, 0.14), (0, 0, 0.16), mat_idx=1, chamfer=0.05)
    # 2: Die central laranja vibrante (#F35A20)
    add_prism_box(bm, (1.02, 1.02, 0.14), (0, 0, 0.24), mat_idx=2, chamfer=0.05)
    # 3: Núcleo brilhante amarelo-bico (#F9BD3C)
    add_prism_box(bm, (0.48, 0.48, 0.10), (0, 0, 0.31), mat_idx=3, chamfer=0.03)

    # Pinos dourados nas 4 bordas
    for i in range(-3, 4):
        offset = i * 0.26
        add_prism_box(bm, (0.11, 0.26, 0.10), (offset, 1.15, -0.06), mat_idx=3, chamfer=0.015)
        add_prism_box(bm, (0.11, 0.26, 0.10), (offset, -1.15, -0.06), mat_idx=3, chamfer=0.015)
        add_prism_box(bm, (0.26, 0.11, 0.10), (1.15, offset, -0.06), mat_idx=3, chamfer=0.015)
        add_prism_box(bm, (0.26, 0.11, 0.10), (-1.15, offset, -0.06), mat_idx=3, chamfer=0.015)

        # Trilhas luminosas no substrato
        if i % 2 == 0:
            add_prism_box(bm, (0.06, 0.32, 0.04), (offset, 0.90, 0.13), mat_idx=3, chamfer=0.005)
            add_prism_box(bm, (0.06, 0.32, 0.04), (offset, -0.90, 0.13), mat_idx=3, chamfer=0.005)
            add_prism_box(bm, (0.32, 0.06, 0.04), (0.90, offset, 0.13), mat_idx=3, chamfer=0.005)
            add_prism_box(bm, (0.32, 0.06, 0.04), (-0.90, offset, 0.13), mat_idx=3, chamfer=0.005)

    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Infortux_CPU_Chip", mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.rotation_euler = (math.radians(52), math.radians(-12), math.radians(28))

    mats = [
        make_facet_mat("CPU_Base", PAL["body_dark"], emit=0.30, rough=0.5),
        make_facet_mat("CPU_Frame", PAL["pad_light"], emit=0.35, rough=0.4),
        make_facet_mat("CPU_Die", PAL["phone_main"], emit=0.55, rough=0.35),
        make_facet_mat("CPU_Gold", PAL["beak_ul"], emit=0.75, rough=0.25, metal=0.6),
    ]
    for m in mats:
        mesh.materials.append(m)
    return obj


def build_terminal() -> bpy.types.Object:
    """Terminal Low Poly com prompt '>_' aceso em amarelo-bico e barra superior laranja."""
    mesh = bpy.data.meshes.new("Infortux_Terminal_Mesh")
    bm = bmesh.new()

    # 0: Gabinete externo facetado roxo
    add_prism_box(bm, (2.5, 0.75, 1.85), (0, 0, 0.15), mat_idx=0, chamfer=0.09)
    # 1: Faixa superior da janela em laranja (#F35A20)
    add_prism_box(bm, (2.18, 0.12, 0.24), (0, -0.36, 0.82), mat_idx=2, chamfer=0.03)
    # 2: Tela escura recuada (#1A0F30)
    add_prism_box(bm, (2.18, 0.10, 1.26), (0, -0.35, 0.02), mat_idx=1, chamfer=0.02)
    # 3: Pedestal / Base
    add_prism_box(bm, (0.55, 0.45, 0.45), (0, 0.05, -0.90), mat_idx=0, chamfer=0.04)
    add_prism_box(bm, (1.35, 0.85, 0.16), (0, 0.02, -1.12), mat_idx=2, chamfer=0.04)

    # Prompt '>' (duas barras diagonais em amarelo-bico #FBC543 apontando para a direita)
    for sign, z_off in ((1, 0.13), (-1, -0.05)):
        ret = bmesh.ops.create_cube(bm, size=1.0)
        vs = ret["verts"]
        bmesh.ops.scale(bm, verts=vs, vec=(0.42, 0.08, 0.11))
        bmesh.ops.rotate(bm, verts=vs, matrix=Matrix.Rotation(math.radians(sign * 32), 3, "Y"))
        bmesh.ops.translate(bm, verts=vs, vec=(-0.58, -0.42, z_off))
        for f in {f for v in vs for f in v.link_faces}:
            f.material_index = 3
            f.smooth = False

    # Cursor '_' piscante em amarelo-bico
    add_prism_box(bm, (0.46, 0.08, 0.12), (0.02, -0.42, -0.16), mat_idx=3, chamfer=0.015)

    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Infortux_Terminal", mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.rotation_euler = (math.radians(8), math.radians(0), math.radians(-14))

    mats = [
        make_facet_mat("Term_Case", PAL["pad_light"], emit=0.35, rough=0.5),
        make_facet_mat("Term_Screen", PAL["eye_pupil"], emit=0.60, rough=0.2),
        make_facet_mat("Term_Orange", PAL["phone_main"], emit=0.65, rough=0.35),
        make_facet_mat("Term_Prompt", PAL["beak_ul"], emit=0.88, rough=0.15),
    ]
    for m in mats:
        mesh.materials.append(m)
    return obj


def build_data_packet() -> bpy.types.Object:
    """Pacote de Dados / Rede Low Poly (cubo facetado com fitas laranja e selo amarelo)."""
    mesh = bpy.data.meshes.new("Infortux_DataPacket_Mesh")
    bm = bmesh.new()

    # 0: Cubo principal roxo facetado
    add_prism_box(bm, (1.85, 1.85, 1.85), (0, 0, 0), mat_idx=0, chamfer=0.12)
    # 1: Fitas cruzadas laranja (#F35A20)
    add_prism_box(bm, (1.94, 0.42, 1.94), (0, 0, 0), mat_idx=1, chamfer=0.05)
    add_prism_box(bm, (0.42, 1.94, 1.94), (0, 0, 0), mat_idx=1, chamfer=0.05)
    add_prism_box(bm, (1.94, 1.94, 0.42), (0, 0, 0), mat_idx=1, chamfer=0.05)
    # 2: Selos / nós de dados amarelos (#FBC543) nos centros das faces
    add_prism_box(bm, (0.62, 0.62, 2.02), (0, 0, 0), mat_idx=2, chamfer=0.04)
    add_prism_box(bm, (0.62, 2.02, 0.62), (0, 0, 0), mat_idx=2, chamfer=0.04)
    add_prism_box(bm, (2.02, 0.62, 0.62), (0, 0, 0), mat_idx=2, chamfer=0.04)

    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Infortux_DataPacket", mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.rotation_euler = (math.radians(28), math.radians(18), math.radians(38))

    mats = [
        make_facet_mat("Pkt_Body", PAL["body_mid"], emit=0.35, rough=0.45),
        make_facet_mat("Pkt_Strap", PAL["phone_main"], emit=0.65, rough=0.35),
        make_facet_mat("Pkt_Node", PAL["beak_ul"], emit=0.80, rough=0.25),
    ]
    for m in mats:
        mesh.materials.append(m)
    return obj


def add_icosphere_puff(bm: bmesh.types.BMesh, radius: float, scale_xyz: tuple, loc_xyz: tuple, mat_idx: int):
    ret = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=radius)
    verts = ret["verts"]
    bmesh.ops.scale(bm, verts=verts, vec=scale_xyz)
    bmesh.ops.translate(bm, verts=verts, vec=loc_xyz)
    for f in {f for v in verts for f in v.link_faces}:
        f.material_index = mat_idx
        f.smooth = False


def build_cloud_server() -> bpy.types.Object:
    """Nuvem Low Poly conectada por feixes de fibra óptica a um Rack de Servidores Linux."""
    mesh = bpy.data.meshes.new("Infortux_CloudServer_Mesh")
    bm = bmesh.new()

    # 1. Nuvem Low Poly no topo (Z ~ +0.75 a +1.25) - Mat 0 (Branco neve) e Mat 1 (Sombra lilás suave)
    add_icosphere_puff(bm, 0.72, (1.15, 0.85, 0.92), (0.0, 0.0, 0.98), mat_idx=0)
    add_icosphere_puff(bm, 0.56, (1.05, 0.82, 0.85), (-0.68, 0.04, 0.78), mat_idx=0)
    add_icosphere_puff(bm, 0.54, (1.05, 0.82, 0.82), (0.70, 0.04, 0.76), mat_idx=0)
    add_icosphere_puff(bm, 0.42, (1.10, 0.78, 0.72), (-0.35, -0.18, 0.72), mat_idx=1)
    add_icosphere_puff(bm, 0.42, (1.10, 0.78, 0.72), (0.38, -0.18, 0.72), mat_idx=1)
    # Base reta chanfrada da nuvem
    add_prism_box(bm, (1.85, 0.88, 0.34), (0.0, 0.0, 0.62), mat_idx=1, chamfer=0.08)

    # 2. Feixes de dados / cabos ópticos conectando a nuvem ao servidor (Z ~ -0.05 a +0.48)
    for x_beam in (-0.48, 0.0, 0.48):
        add_prism_box(bm, (0.09, 0.09, 0.68), (x_beam, 0.0, 0.18), mat_idx=3, chamfer=0.015)
    # Pacotinhos de dados subindo/descendo nos feixes
    add_prism_box(bm, (0.22, 0.22, 0.22), (-0.48, -0.04, 0.28), mat_idx=4, chamfer=0.03)
    add_prism_box(bm, (0.24, 0.24, 0.24), (0.0, -0.06, 0.08), mat_idx=3, chamfer=0.03)
    add_prism_box(bm, (0.22, 0.22, 0.22), (0.48, -0.04, 0.24), mat_idx=4, chamfer=0.03)

    # 3. Rack de Servidores (Data Center) na base (Z ~ -1.15 a -0.15)
    # Gabinete externo roxo-escuro
    add_prism_box(bm, (2.10, 1.15, 1.12), (0.0, 0.0, -0.68), mat_idx=2, chamfer=0.07)
    # 3 lâminas (blades) de servidor frontais com frisos laranja e LEDs amarelos
    for idx, z_blade in enumerate((-0.34, -0.68, -1.02)):
        add_prism_box(bm, (1.86, 0.14, 0.24), (0.0, -0.54, z_blade), mat_idx=5, chamfer=0.025)
        # Faixa laranja à esquerda da blade
        add_prism_box(bm, (0.68, 0.08, 0.12), (-0.48, -0.60, z_blade), mat_idx=3, chamfer=0.015)
        # 3 LEDs amarelos de atividade à direita
        for led_i in range(3):
            lx = 0.28 + led_i * 0.22
            add_prism_box(bm, (0.11, 0.08, 0.11), (lx, -0.60, z_blade), mat_idx=4, chamfer=0.015)

    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Infortux_CloudServer", mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.rotation_euler = (math.radians(6), math.radians(0), math.radians(-12))

    mats = [
        make_facet_mat("Cloud_White", PAL["mask_pure"], emit=0.58, rough=0.35),
        make_facet_mat("Cloud_Shade", PAL["mask_mid"], emit=0.45, rough=0.45),
        make_facet_mat("Rack_Body", PAL["body_dark"], emit=0.30, rough=0.50),
        make_facet_mat("Data_Orange", PAL["phone_main"], emit=0.70, rough=0.30),
        make_facet_mat("Data_Yellow", PAL["beak_ul"], emit=0.88, rough=0.20),
        make_facet_mat("Rack_Blade", PAL["pad_light"], emit=0.38, rough=0.42),
    ]
    for m in mats:
        mesh.materials.append(m)
    return obj


def process_asset(name: str, builder_fn):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    setup_scene_and_lights()

    obj = builder_fn()

    models_dir = os.path.join(OUT, "models")
    renders_dir = os.path.join(OUT, "renders")
    demos_dir = os.path.join(OUT, "demos")

    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    glb_path = os.path.join(models_dir, f"{name}.glb")
    bpy.ops.export_scene.gltf(filepath=glb_path, export_format="GLB", use_selection=True)

    build_ubuntu_suru_backdrop(width=18.0, height=18.0, y_depth=4.2)
    cam = make_camera("Cam_Asset", (0.0, -5.6, 0.15), (0.0, 0.0, 0.0), lens=55.0)

    png_path = os.path.join(renders_dir, f"{name}_preview.png")
    render_png(cam, png_path, 1080, 1080, samples=16)

    blend_path = os.path.join(models_dir, f"{name}.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)

    # Turntable curto (45 frames = 1.5s a 30fps)
    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = 45
    scene.render.fps = 30
    base_rot = tuple(obj.rotation_euler)
    obj.keyframe_insert("rotation_euler", frame=1)
    obj.rotation_euler = (base_rot[0], base_rot[1], base_rot[2] + math.radians(360))
    obj.keyframe_insert("rotation_euler", frame=45)

    tmp_dir = f"/tmp/frames_{name}"
    shutil.rmtree(tmp_dir, ignore_errors=True)
    os.makedirs(tmp_dir, exist_ok=True)
    scene.render.resolution_x = 720
    scene.render.resolution_y = 720
    if hasattr(scene.eevee, "taa_render_samples"):
        scene.eevee.taa_render_samples = 6
    scene.render.filepath = os.path.join(tmp_dir, "f_")
    bpy.ops.render.render(animation=True)

    mp4_path = os.path.join(demos_dir, f"{name}_demo.mp4")
    subprocess.run([
        "ffmpeg", "-y", "-loglevel", "error", "-framerate", "30",
        "-i", os.path.join(tmp_dir, "f_%04d.png"),
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", mp4_path
    ], check=True)
    shutil.rmtree(tmp_dir, ignore_errors=True)
    if os.path.isdir(BRAIN_DIR):
        shutil.copy2(mp4_path, os.path.join(BRAIN_DIR, os.path.basename(mp4_path)))
    print(f"  [+] Asset finalizado: {name}")


def main():
    all_assets = [
        ("infortux_cpu_chip", build_cpu_chip),
        ("infortux_terminal", build_terminal),
        ("infortux_data_packet", build_data_packet),
        ("infortux_cloud_server", build_cloud_server),
    ]
    filter_names = set()
    if "--" in sys.argv:
        filter_names = set(sys.argv[sys.argv.index("--") + 1:])
    for name, fn in all_assets:
        if not filter_names or name in filter_names:
            process_asset(name, fn)


if __name__ == "__main__":
    main()
