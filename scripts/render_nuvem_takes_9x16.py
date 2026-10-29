"""
Renderiza os 6 Takes 3D Verticais Nativos (1080x1920, 30 fps) no Blender 5.2
para o vídeo "O que é a nuvem?" (canal Infortux), respeitando as zonas seguras do Shorts:
  - Topo (Y: 160-420px): livre para On-Screen Text (#F9BD3C)
  - Centro (Y: 420-1380px): palco 3D principal
  - Base (Y: 1380-1660px): livre para Legenda Dinâmica (80%)

Execução:
  /usr/bin/blender -b --factory-startup --python-exit-code 1 -P scripts/render_nuvem_takes_9x16.py
"""

import math
import os
import shutil
import subprocess
import sys

user_site = os.path.expanduser("~/.local/lib/python3.14/site-packages")
if os.path.isdir(user_site) and user_site not in sys.path:
    sys.path.insert(0, user_site)

sys.path.insert(0, os.path.dirname(__file__))

import bpy  # noqa: E402

from build_infortux_pinguim_3d import (  # noqa: E402
    ROOT,
    build_ubuntu_suru_backdrop,
    make_empty,
    build_infortux_penguin,
    setup_scene_and_lights,
    make_camera,
    animate_penguin_idle,
)
from build_infortux_3d_assets import (  # noqa: E402
    build_cloud_server,
    build_cpu_chip,
    build_data_packet,
    build_terminal,
)

RAW_DIR = os.path.join(ROOT, "resource", "projects", "o-que-e-a-nuvem", "raw")


def render_clip_9x16(name: str, cam: bpy.types.Object, frames: int = 90) -> str:
    os.makedirs(RAW_DIR, exist_ok=True)
    out_mp4 = os.path.join(RAW_DIR, f"{name}.mp4")

    scene = bpy.context.scene
    scene.camera = cam
    scene.frame_start = 1
    scene.frame_end = frames
    scene.render.fps = 30
    scene.render.resolution_x = 1080
    scene.render.resolution_y = 1920
    scene.render.resolution_percentage = 100
    if hasattr(scene.eevee, "taa_render_samples"):
        scene.eevee.taa_render_samples = 4

    tmp_dir = f"/tmp/frames_9x16_{name}"
    shutil.rmtree(tmp_dir, ignore_errors=True)
    os.makedirs(tmp_dir, exist_ok=True)
    scene.render.filepath = os.path.join(tmp_dir, "f_")
    bpy.ops.render.render(animation=True)

    subprocess.run(
        [
            "ffmpeg", "-y", "-loglevel", "error",
            "-framerate", "30",
            "-i", os.path.join(tmp_dir, "f_%04d.png"),
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18",
            out_mp4,
        ],
        check=True,
    )
    shutil.rmtree(tmp_dir, ignore_errors=True)
    print(f"  [+] Take 9:16 salvo: {out_mp4}")
    return out_mp4


def make_take_pinguim():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    setup_scene_and_lights()
    build_ubuntu_suru_backdrop(width=18.0, height=26.0, y_depth=4.2)
    root = make_empty("Infortux_Pinguim")
    eyes, phones = build_infortux_penguin(root)
    animate_penguin_idle(root, eyes, phones, frames=90)
    cam = make_camera("Cam_Pinguim_9x16", (0.0, -8.5, 0.15), (0.0, 0.0, 0.15), lens=50.0)
    render_clip_9x16("take_pinguim_curioso", cam, frames=90)


def make_take_cloud_server_geral():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    setup_scene_and_lights()
    build_ubuntu_suru_backdrop(width=15.0, height=26.0, y_depth=4.2)
    obj = build_cloud_server()
    obj.location = (0.0, 0.0, 0.12)
    obj.rotation_euler = (math.radians(8), 0.0, math.radians(-18))
    obj.keyframe_insert("rotation_euler", frame=1)
    obj.keyframe_insert("location", frame=1)

    obj.rotation_euler = (math.radians(6), 0.0, math.radians(18))
    obj.location = (0.0, 0.0, 0.22)
    obj.keyframe_insert("rotation_euler", frame=45)
    obj.keyframe_insert("location", frame=45)

    obj.rotation_euler = (math.radians(8), 0.0, math.radians(-18))
    obj.location = (0.0, 0.0, 0.12)
    obj.keyframe_insert("rotation_euler", frame=90)
    obj.keyframe_insert("location", frame=90)

    cam = make_camera("Cam_Cloud_9x16", (0.0, -7.6, 0.05), (0.0, 0.0, 0.05), lens=52.0)
    render_clip_9x16("take_nuvem_servidor_geral", cam, frames=90)


def make_take_servidor_blades_close():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    setup_scene_and_lights()
    build_ubuntu_suru_backdrop(width=15.0, height=26.0, y_depth=4.2)
    obj = build_cloud_server()
    obj.location = (0.0, 0.0, 0.55)
    obj.rotation_euler = (math.radians(4), 0.0, math.radians(-10))
    obj.keyframe_insert("rotation_euler", frame=1)
    obj.rotation_euler = (math.radians(4), 0.0, math.radians(12))
    obj.keyframe_insert("rotation_euler", frame=90)

    cam = make_camera("Cam_Blades_9x16", (0.0, -5.8, -0.10), (0.0, 0.0, -0.12), lens=62.0)
    cam.location = (0.0, -6.1, -0.08)
    cam.keyframe_insert("location", frame=1)
    cam.location = (0.0, -5.2, -0.12)
    cam.keyframe_insert("location", frame=90)
    render_clip_9x16("take_servidor_blades_close", cam, frames=90)


def make_take_cpu_memoria():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    setup_scene_and_lights()
    build_ubuntu_suru_backdrop(width=15.0, height=26.0, y_depth=4.2)
    obj = build_cpu_chip()
    obj.location = (0.0, 0.0, 0.08)
    base_r = tuple(obj.rotation_euler)
    obj.keyframe_insert("rotation_euler", frame=1)
    obj.rotation_euler = (base_r[0], base_r[1], base_r[2] + math.radians(360))
    obj.keyframe_insert("rotation_euler", frame=90)

    cam = make_camera("Cam_CPU_9x16", (0.0, -7.2, 0.05), (0.0, 0.0, 0.05), lens=54.0)
    render_clip_9x16("take_cpu_memoria", cam, frames=90)


def make_take_pacote_dados():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    setup_scene_and_lights()
    build_ubuntu_suru_backdrop(width=15.0, height=26.0, y_depth=4.2)
    obj = build_data_packet()
    obj.location = (0.0, 0.0, 0.05)
    obj.scale = (0.92, 0.92, 0.92)
    base_r = tuple(obj.rotation_euler)
    obj.keyframe_insert("rotation_euler", frame=1)
    obj.keyframe_insert("scale", frame=1)

    obj.scale = (1.08, 1.08, 1.08)
    obj.keyframe_insert("scale", frame=45)

    obj.rotation_euler = (base_r[0] + math.radians(360), base_r[1], base_r[2] + math.radians(360))
    obj.scale = (0.92, 0.92, 0.92)
    obj.keyframe_insert("rotation_euler", frame=90)
    obj.keyframe_insert("scale", frame=90)

    cam = make_camera("Cam_Packet_9x16", (0.0, -7.4, 0.05), (0.0, 0.0, 0.05), lens=54.0)
    render_clip_9x16("take_pacote_dados", cam, frames=90)


def make_take_terminal_linux():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    setup_scene_and_lights()
    build_ubuntu_suru_backdrop(width=15.0, height=26.0, y_depth=4.2)
    obj = build_terminal()
    obj.location = (0.0, 0.0, 0.08)
    obj.rotation_euler = (math.radians(8), 0.0, math.radians(-16))
    obj.keyframe_insert("rotation_euler", frame=1)
    obj.rotation_euler = (math.radians(6), 0.0, math.radians(16))
    obj.keyframe_insert("rotation_euler", frame=45)
    obj.rotation_euler = (math.radians(8), 0.0, math.radians(-16))
    obj.keyframe_insert("rotation_euler", frame=90)

    cam = make_camera("Cam_Term_9x16", (0.0, -7.2, 0.05), (0.0, 0.0, 0.05), lens=54.0)
    render_clip_9x16("take_terminal_linux", cam, frames=90)


def main():
    make_take_pinguim()
    make_take_cloud_server_geral()
    make_take_servidor_blades_close()
    make_take_cpu_memoria()
    make_take_pacote_dados()
    make_take_terminal_linux()


if __name__ == "__main__":
    main()
