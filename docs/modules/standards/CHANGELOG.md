# Standards, Classes & Boards Changelog

## [1.1.0] - 2026-11-04
### Added
- **Boards Management**: Added `boards` table and `Board` model supporting `ICSE`, `CBSE`, and `SSC` affiliations.
- **Board Linkage on Divisions**: Added `board_id` foreign key on `divisions` linking batches directly to their educational boards.
- **Class / Standard Harmonization**: Standards updated with Roman class designations (`Class X`, `Class IX`, `Class VIII`).
- **Batch Normalization**: Realigned `ICSE 9th` to `ICSE IX` to establish uniform Roman numeral batch nomenclature (`ICSE X`, `CBSE X`, `ICSE IX`, `ICSE VIII`, `SSC IX`).
- **Student Roster Registration**: All 39 enrolled students registered under their exact verified board and class allocations without any duplicates or omissions.
- **Alembic Migration `003_add_boards`**: Schema migration establishing `boards` table and division relationship.
- **Automated Test Suite**: Added `test_board_class_structure.py` verifying boards, divisions, and API endpoints.

## [1.0.0] - 2024-01-01
### Added
- Standard and division entity management.
- Dynamic occupancy bar calculations in `Standards.tsx`.
- Default seeding for Standards 1 through 12 with Divisions A and B.
