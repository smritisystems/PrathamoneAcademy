# /**
#  * @file        seed_clean_eduboard.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      scripts
#  *
#  * @author      Jawahar R. Mallah
#  * @organization Smritisys & AITDL Networks
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 PrathamOne EduOS
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-19
#  * @updated     2026-11-19
#  *
#  * @description Seeds a pristine, broadcast-ready EduBoard with a structured CBSE XII Physics Vector Resolution academic diagram on a classic green chalkboard.
#  */

import json
import asyncio
import asyncpg
from datetime import datetime, timezone


def generate_vector_diagram_elements():
    """Builds clean Konva elements for 2D Vector Resolution on Greenboard."""
    elements = [
        # Lesson Header
        {
            "id": "el_title_header",
            "type": "text",
            "x": 80,
            "y": 35,
            "text": "CBSE CLASS XII PHYSICS  •  2D VECTOR RESOLUTION & CARTESIAN MECHANICS",
            "fontSize": 19,
            "color": "#F8FAFC",
        },
        {
            "id": "el_divider_line",
            "type": "line",
            "points": [80, 68, 1200, 68],
            "color": "#1E6B4D",
            "size": 2,
        },
        # Cartesian Coordinate Axes
        {
            "id": "el_x_axis",
            "type": "arrow",
            "points": [160, 490, 800, 490],
            "color": "#E2E8F0",
            "size": 3,
        },
        {
            "id": "el_x_label",
            "type": "text",
            "x": 810,
            "y": 480,
            "text": "X (Horizontal Displacement)",
            "fontSize": 15,
            "color": "#CBD5E1",
        },
        {
            "id": "el_y_axis",
            "type": "arrow",
            "points": [240, 560, 240, 130],
            "color": "#E2E8F0",
            "size": 3,
        },
        {
            "id": "el_y_label",
            "type": "text",
            "x": 220,
            "y": 105,
            "text": "Y (Vertical Velocity Component)",
            "fontSize": 15,
            "color": "#CBD5E1",
        },
        {
            "id": "el_origin_label",
            "type": "text",
            "x": 205,
            "y": 498,
            "text": "O (0,0)",
            "fontSize": 14,
            "color": "#94A3B8",
        },
        # Resultant Vector R (Vibrant Orange Chalk)
        {
            "id": "el_vector_r",
            "type": "arrow",
            "points": [240, 490, 640, 230],
            "color": "#F16906",
            "size": 5,
        },
        {
            "id": "el_vector_r_label",
            "type": "text",
            "x": 450,
            "y": 205,
            "text": "Resultant Vector R  (|R| = 50.0 m/s)",
            "fontSize": 17,
            "color": "#F16906",
        },
        # Horizontal Projection Rx (Cyan Chalk Line & Label)
        {
            "id": "el_proj_x",
            "type": "line",
            "points": [240, 490, 640, 490],
            "color": "#38BDF8",
            "size": 3,
        },
        {
            "id": "el_rx_label",
            "type": "text",
            "x": 360,
            "y": 508,
            "text": "Rx = R · cos(θ) = 40.0 m/s",
            "fontSize": 16,
            "color": "#38BDF8",
        },
        # Vertical Projection Ry (Emerald Chalk Line & Label)
        {
            "id": "el_proj_y_dashed",
            "type": "line",
            "points": [640, 490, 640, 230],
            "color": "#10B981",
            "size": 3,
        },
        {
            "id": "el_ry_label",
            "type": "text",
            "x": 655,
            "y": 350,
            "text": "Ry = R · sin(θ) = 30.0 m/s",
            "fontSize": 16,
            "color": "#10B981",
        },
        # Angle theta
        {
            "id": "el_theta_label",
            "type": "text",
            "x": 310,
            "y": 455,
            "text": "θ = 36.87°",
            "fontSize": 15,
            "color": "#FBBF24",
        },
        # Right Side: Analytical Formulas Chalkboard Panel
        {
            "id": "el_formula_box",
            "type": "rect",
            "x": 860,
            "y": 120,
            "width": 360,
            "height": 380,
            "color": "#1E6B4D",
            "size": 2,
        },
        {
            "id": "el_box_title",
            "type": "text",
            "x": 885,
            "y": 140,
            "text": "ANALYTICAL KINEMATICS",
            "fontSize": 16,
            "color": "#FBBF24",
        },
        {
            "id": "el_formula_1",
            "type": "text",
            "x": 885,
            "y": 185,
            "text": "1. Vector Decomposition:",
            "fontSize": 14,
            "color": "#CBD5E1",
        },
        {
            "id": "el_formula_1_sub",
            "type": "text",
            "x": 905,
            "y": 210,
            "text": "R = Rx · i + Ry · j",
            "fontSize": 16,
            "color": "#FFFFFF",
        },
        {
            "id": "el_formula_2",
            "type": "text",
            "x": 885,
            "y": 250,
            "text": "2. Magnitude Formula:",
            "fontSize": 14,
            "color": "#CBD5E1",
        },
        {
            "id": "el_formula_2_sub",
            "type": "text",
            "x": 905,
            "y": 275,
            "text": "|R| = √(40² + 30²) = 50 m/s",
            "fontSize": 16,
            "color": "#38BDF8",
        },
        {
            "id": "el_formula_3",
            "type": "text",
            "x": 885,
            "y": 320,
            "text": "3. Direction Tangent:",
            "fontSize": 14,
            "color": "#CBD5E1",
        },
        {
            "id": "el_formula_3_sub",
            "type": "text",
            "x": 905,
            "y": 345,
            "text": "tan(θ) = 30 / 40 = 0.75",
            "fontSize": 16,
            "color": "#10B981",
        },
        {
            "id": "el_formula_footer",
            "type": "text",
            "x": 885,
            "y": 420,
            "text": "Verified: Class 12 Physics Mechanics",
            "fontSize": 13,
            "color": "#F16906",
        },
    ]
    return elements


async def seed_clean_eduboard():
    conn = await asyncpg.connect("postgresql://postgres:postgres@localhost:5432/prashant_academy")
    now = datetime.now(timezone.utc)

    # 1. Soft delete old test board TS-EDUBOARD-001 so it never pops up as default
    await conn.execute("UPDATE edu_boards SET is_deleted = true WHERE id = 3")
    print("Archived old cluttered test board (ID 3).")

    # 2. Check if clean physics board already exists
    existing = await conn.fetchrow("SELECT id FROM edu_boards WHERE board_code = 'EB-PHYSICS-VECTORS-01'")
    scene_payload = {
        "schemaVersion": 1,
        "elements": generate_vector_diagram_elements(),
    }
    scene_json = json.dumps(scene_payload)

    if existing:
        board_id = existing["id"]
        print(f"Board EB-PHYSICS-VECTORS-01 exists (ID: {board_id}). Updating page 1...")
        await conn.execute(
            """
            UPDATE edu_board_pages 
            SET mode = 'classic', background_style = 'greenboard', scene_json = $1, updated_at = $2
            WHERE board_id = $3 AND page_order = 1
            """,
            scene_json,
            now,
            board_id,
        )
        await conn.execute(
            """
            UPDATE edu_boards 
            SET title = 'CBSE XII • Vector Kinematics & Mechanics',
                topic = '2D Vector Resolution & Projectile Motion',
                board_mode_default = 'classic',
                is_deleted = false,
                updated_at = $1
            WHERE id = $2
            """,
            now,
            board_id,
        )
    else:
        print("Inserting clean board EB-PHYSICS-VECTORS-01...")
        row = await conn.fetchrow(
            """
            INSERT INTO edu_boards (
                board_code, institution_id, is_demo, academic_year_id,
                teacher_user_id, standard_id, division_id, subject_id,
                title, topic, board_mode_default, status, is_template,
                collaboration_enabled, latest_revision_no, page_count,
                is_deleted, created_at, updated_at
            ) VALUES (
                'EB-PHYSICS-VECTORS-01', 1, false, 1,
                1, 10, 26, 1,
                'CBSE XII • Vector Kinematics & Mechanics',
                '2D Vector Resolution & Projectile Motion',
                'classic', 'active', false,
                false, 1, 1,
                false, $1, $1
            ) RETURNING id
            """,
            now,
        )
        board_id = row["id"]

        await conn.execute(
            """
            INSERT INTO edu_board_pages (
                board_id, page_uid, page_order, title, mode,
                background_style, scene_json, version, created_at, updated_at
            ) VALUES (
                $1, 'pg_physics_vectors_01', 1, 'Vector Resolution & Kinematics',
                'classic', 'greenboard', $2, 1, $3, $3
            )
            """,
            board_id,
            scene_json,
            now,
        )
        print(f"Inserted clean board ID {board_id} with pristine greenboard physics diagram.")

    # Verify active boards
    active = await conn.fetch("SELECT id, board_code, title, board_mode_default, page_count FROM edu_boards WHERE is_deleted = false ORDER BY id")
    print(f"\nActive EduBoards ({len(active)}):")
    for b in active:
        print("  ", dict(b))

    await conn.close()


if __name__ == "__main__":
    asyncio.run(seed_clean_eduboard())
