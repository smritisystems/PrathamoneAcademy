--
-- PostgreSQL database dump
--

\restrict 1uCruHWiMtadQoNX0JUu7S1zcBYUfKVhNNnHEpntjStmS14o5jcQ9ZqaUac0PhT

-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_student_id_fkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_role_id_fkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_institution_id_fkey;
ALTER TABLE IF EXISTS ONLY public.timetable_entries DROP CONSTRAINT IF EXISTS timetable_entries_subject_id_fkey;
ALTER TABLE IF EXISTS ONLY public.timetable_entries DROP CONSTRAINT IF EXISTS timetable_entries_division_id_fkey;
ALTER TABLE IF EXISTS ONLY public.subjects DROP CONSTRAINT IF EXISTS subjects_standard_id_fkey;
ALTER TABLE IF EXISTS ONLY public.study_materials DROP CONSTRAINT IF EXISTS study_materials_subject_id_fkey;
ALTER TABLE IF EXISTS ONLY public.study_materials DROP CONSTRAINT IF EXISTS study_materials_standard_id_fkey;
ALTER TABLE IF EXISTS ONLY public.study_materials DROP CONSTRAINT IF EXISTS study_materials_institution_id_fkey;
ALTER TABLE IF EXISTS ONLY public.study_materials DROP CONSTRAINT IF EXISTS study_materials_division_id_fkey;
ALTER TABLE IF EXISTS ONLY public.students DROP CONSTRAINT IF EXISTS students_institution_id_fkey;
ALTER TABLE IF EXISTS ONLY public.student_fee_assignments DROP CONSTRAINT IF EXISTS student_fee_assignments_student_id_fkey;
ALTER TABLE IF EXISTS ONLY public.student_fee_assignments DROP CONSTRAINT IF EXISTS student_fee_assignments_scholarship_id_fkey;
ALTER TABLE IF EXISTS ONLY public.student_fee_assignments DROP CONSTRAINT IF EXISTS student_fee_assignments_fee_structure_id_fkey;
ALTER TABLE IF EXISTS ONLY public.student_fee_assignments DROP CONSTRAINT IF EXISTS student_fee_assignments_discount_id_fkey;
ALTER TABLE IF EXISTS ONLY public.student_fee_assignments DROP CONSTRAINT IF EXISTS student_fee_assignments_academic_year_id_fkey;
ALTER TABLE IF EXISTS ONLY public.student_enrollments DROP CONSTRAINT IF EXISTS student_enrollments_student_id_fkey;
ALTER TABLE IF EXISTS ONLY public.student_enrollments DROP CONSTRAINT IF EXISTS student_enrollments_standard_id_fkey;
ALTER TABLE IF EXISTS ONLY public.student_enrollments DROP CONSTRAINT IF EXISTS student_enrollments_division_id_fkey;
ALTER TABLE IF EXISTS ONLY public.student_enrollments DROP CONSTRAINT IF EXISTS student_enrollments_academic_year_id_fkey;
ALTER TABLE IF EXISTS ONLY public.student_documents DROP CONSTRAINT IF EXISTS student_documents_student_id_fkey;
ALTER TABLE IF EXISTS ONLY public.standards DROP CONSTRAINT IF EXISTS standards_institution_id_fkey;
ALTER TABLE IF EXISTS ONLY public.scholarships DROP CONSTRAINT IF EXISTS scholarships_institution_id_fkey;
ALTER TABLE IF EXISTS ONLY public.permissions DROP CONSTRAINT IF EXISTS permissions_role_id_fkey;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_student_id_fkey;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_reversed_by_id_fkey;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_collected_by_id_fkey;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_academic_year_id_fkey;
ALTER TABLE IF EXISTS ONLY public.payment_receipts DROP CONSTRAINT IF EXISTS payment_receipts_student_id_fkey;
ALTER TABLE IF EXISTS ONLY public.payment_receipts DROP CONSTRAINT IF EXISTS payment_receipts_payment_id_fkey;
ALTER TABLE IF EXISTS ONLY public.payment_allocations DROP CONSTRAINT IF EXISTS payment_allocations_payment_id_fkey;
ALTER TABLE IF EXISTS ONLY public.payment_allocations DROP CONSTRAINT IF EXISTS payment_allocations_invoice_id_fkey;
ALTER TABLE IF EXISTS ONLY public.payment_allocations DROP CONSTRAINT IF EXISTS payment_allocations_installment_id_fkey;
ALTER TABLE IF EXISTS ONLY public.guardians DROP CONSTRAINT IF EXISTS guardians_student_id_fkey;
ALTER TABLE IF EXISTS ONLY public.fee_structures DROP CONSTRAINT IF EXISTS fee_structures_standard_id_fkey;
ALTER TABLE IF EXISTS ONLY public.fee_structures DROP CONSTRAINT IF EXISTS fee_structures_institution_id_fkey;
ALTER TABLE IF EXISTS ONLY public.fee_structures DROP CONSTRAINT IF EXISTS fee_structures_category_id_fkey;
ALTER TABLE IF EXISTS ONLY public.fee_structures DROP CONSTRAINT IF EXISTS fee_structures_academic_year_id_fkey;
ALTER TABLE IF EXISTS ONLY public.fee_register_imports DROP CONSTRAINT IF EXISTS fee_register_imports_institution_id_fkey;
ALTER TABLE IF EXISTS ONLY public.fee_register_imports DROP CONSTRAINT IF EXISTS fee_register_imports_imported_by_id_fkey;
ALTER TABLE IF EXISTS ONLY public.fee_register_imports DROP CONSTRAINT IF EXISTS fee_register_imports_academic_year_id_fkey;
ALTER TABLE IF EXISTS ONLY public.fee_invoices DROP CONSTRAINT IF EXISTS fee_invoices_student_id_fkey;
ALTER TABLE IF EXISTS ONLY public.fee_invoices DROP CONSTRAINT IF EXISTS fee_invoices_assignment_id_fkey;
ALTER TABLE IF EXISTS ONLY public.fee_invoices DROP CONSTRAINT IF EXISTS fee_invoices_academic_year_id_fkey;
ALTER TABLE IF EXISTS ONLY public.fee_invoice_items DROP CONSTRAINT IF EXISTS fee_invoice_items_invoice_id_fkey;
ALTER TABLE IF EXISTS ONLY public.fee_invoice_items DROP CONSTRAINT IF EXISTS fee_invoice_items_fee_structure_id_fkey;
ALTER TABLE IF EXISTS ONLY public.fee_installments DROP CONSTRAINT IF EXISTS fee_installments_invoice_id_fkey;
ALTER TABLE IF EXISTS ONLY public.fee_categories DROP CONSTRAINT IF EXISTS fee_categories_institution_id_fkey;
ALTER TABLE IF EXISTS ONLY public.examinations DROP CONSTRAINT IF EXISTS examinations_standard_id_fkey;
ALTER TABLE IF EXISTS ONLY public.examinations DROP CONSTRAINT IF EXISTS examinations_academic_year_id_fkey;
ALTER TABLE IF EXISTS ONLY public.exam_marks DROP CONSTRAINT IF EXISTS exam_marks_subject_id_fkey;
ALTER TABLE IF EXISTS ONLY public.exam_marks DROP CONSTRAINT IF EXISTS exam_marks_student_id_fkey;
ALTER TABLE IF EXISTS ONLY public.exam_marks DROP CONSTRAINT IF EXISTS exam_marks_examination_id_fkey;
ALTER TABLE IF EXISTS ONLY public.divisions DROP CONSTRAINT IF EXISTS divisions_standard_id_fkey;
ALTER TABLE IF EXISTS ONLY public.divisions DROP CONSTRAINT IF EXISTS divisions_class_teacher_id_fkey;
ALTER TABLE IF EXISTS ONLY public.divisions DROP CONSTRAINT IF EXISTS divisions_board_id_fkey;
ALTER TABLE IF EXISTS ONLY public.discounts DROP CONSTRAINT IF EXISTS discounts_institution_id_fkey;
ALTER TABLE IF EXISTS ONLY public.data_import_logs DROP CONSTRAINT IF EXISTS data_import_logs_institution_id_fkey;
ALTER TABLE IF EXISTS ONLY public.data_import_logs DROP CONSTRAINT IF EXISTS data_import_logs_imported_by_id_fkey;
ALTER TABLE IF EXISTS ONLY public.data_import_logs DROP CONSTRAINT IF EXISTS data_import_logs_academic_year_id_fkey;
ALTER TABLE IF EXISTS ONLY public.boards DROP CONSTRAINT IF EXISTS boards_institution_id_fkey;
ALTER TABLE IF EXISTS ONLY public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.attendances DROP CONSTRAINT IF EXISTS attendances_student_id_fkey;
ALTER TABLE IF EXISTS ONLY public.attendances DROP CONSTRAINT IF EXISTS attendances_marked_by_id_fkey;
ALTER TABLE IF EXISTS ONLY public.attendances DROP CONSTRAINT IF EXISTS attendances_enrollment_id_fkey;
ALTER TABLE IF EXISTS ONLY public.announcements DROP CONSTRAINT IF EXISTS announcements_standard_id_fkey;
ALTER TABLE IF EXISTS ONLY public.announcements DROP CONSTRAINT IF EXISTS announcements_institution_id_fkey;
ALTER TABLE IF EXISTS ONLY public.announcements DROP CONSTRAINT IF EXISTS announcements_division_id_fkey;
ALTER TABLE IF EXISTS ONLY public.academic_years DROP CONSTRAINT IF EXISTS academic_years_institution_id_fkey;
DROP INDEX IF EXISTS public.uq_timetable_division_slot;
DROP INDEX IF EXISTS public.uq_subjects_standard_code;
DROP INDEX IF EXISTS public.uq_student_fee_assignment_ay;
DROP INDEX IF EXISTS public.uq_standards_institution_level;
DROP INDEX IF EXISTS public.uq_divisions_standard_board_code;
DROP INDEX IF EXISTS public.uq_active_student_academic_year;
DROP INDEX IF EXISTS public.ix_users_username;
DROP INDEX IF EXISTS public.ix_users_staff_code;
DROP INDEX IF EXISTS public.ix_users_invitation_status;
DROP INDEX IF EXISTS public.ix_users_id;
DROP INDEX IF EXISTS public.ix_timetable_entries_id;
DROP INDEX IF EXISTS public.ix_subjects_id;
DROP INDEX IF EXISTS public.ix_study_materials_id;
DROP INDEX IF EXISTS public.ix_students_id;
DROP INDEX IF EXISTS public.ix_students_admission_number;
DROP INDEX IF EXISTS public.ix_student_fee_assignments_id;
DROP INDEX IF EXISTS public.ix_student_enrollments_student_ay;
DROP INDEX IF EXISTS public.ix_student_enrollments_id;
DROP INDEX IF EXISTS public.ix_student_documents_id;
DROP INDEX IF EXISTS public.ix_standards_id;
DROP INDEX IF EXISTS public.ix_scholarships_id;
DROP INDEX IF EXISTS public.ix_roles_id;
DROP INDEX IF EXISTS public.ix_permissions_id;
DROP INDEX IF EXISTS public.ix_payments_student_date;
DROP INDEX IF EXISTS public.ix_payments_id;
DROP INDEX IF EXISTS public.ix_payment_receipts_receipt_number;
DROP INDEX IF EXISTS public.ix_payment_receipts_id;
DROP INDEX IF EXISTS public.ix_payment_allocations_payment_id;
DROP INDEX IF EXISTS public.ix_payment_allocations_invoice_id;
DROP INDEX IF EXISTS public.ix_payment_allocations_id;
DROP INDEX IF EXISTS public.ix_institutions_id;
DROP INDEX IF EXISTS public.ix_guardians_id;
DROP INDEX IF EXISTS public.ix_fee_structures_id;
DROP INDEX IF EXISTS public.ix_fee_register_imports_id;
DROP INDEX IF EXISTS public.ix_fee_register_imports_file_hash;
DROP INDEX IF EXISTS public.ix_fee_invoices_student_ay;
DROP INDEX IF EXISTS public.ix_fee_invoices_invoice_number;
DROP INDEX IF EXISTS public.ix_fee_invoices_id;
DROP INDEX IF EXISTS public.ix_fee_invoice_items_id;
DROP INDEX IF EXISTS public.ix_fee_installments_id;
DROP INDEX IF EXISTS public.ix_fee_categories_id;
DROP INDEX IF EXISTS public.ix_examinations_id;
DROP INDEX IF EXISTS public.ix_exam_marks_student_id;
DROP INDEX IF EXISTS public.ix_exam_marks_id;
DROP INDEX IF EXISTS public.ix_divisions_status;
DROP INDEX IF EXISTS public.ix_divisions_standard_id;
DROP INDEX IF EXISTS public.ix_divisions_id;
DROP INDEX IF EXISTS public.ix_divisions_board_id;
DROP INDEX IF EXISTS public.ix_discounts_id;
DROP INDEX IF EXISTS public.ix_data_import_logs_id;
DROP INDEX IF EXISTS public.ix_data_import_logs_entity_type;
DROP INDEX IF EXISTS public.ix_boards_id;
DROP INDEX IF EXISTS public.ix_audit_logs_id;
DROP INDEX IF EXISTS public.ix_attendances_student_date;
DROP INDEX IF EXISTS public.ix_attendances_id;
DROP INDEX IF EXISTS public.ix_announcements_id;
DROP INDEX IF EXISTS public.ix_academic_years_id;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE IF EXISTS ONLY public.timetable_entries DROP CONSTRAINT IF EXISTS timetable_entries_pkey;
ALTER TABLE IF EXISTS ONLY public.subjects DROP CONSTRAINT IF EXISTS subjects_pkey;
ALTER TABLE IF EXISTS ONLY public.study_materials DROP CONSTRAINT IF EXISTS study_materials_pkey;
ALTER TABLE IF EXISTS ONLY public.students DROP CONSTRAINT IF EXISTS students_pkey;
ALTER TABLE IF EXISTS ONLY public.student_fee_assignments DROP CONSTRAINT IF EXISTS student_fee_assignments_pkey;
ALTER TABLE IF EXISTS ONLY public.student_enrollments DROP CONSTRAINT IF EXISTS student_enrollments_pkey;
ALTER TABLE IF EXISTS ONLY public.student_documents DROP CONSTRAINT IF EXISTS student_documents_pkey;
ALTER TABLE IF EXISTS ONLY public.standards DROP CONSTRAINT IF EXISTS standards_pkey;
ALTER TABLE IF EXISTS ONLY public.scholarships DROP CONSTRAINT IF EXISTS scholarships_pkey;
ALTER TABLE IF EXISTS ONLY public.roles DROP CONSTRAINT IF EXISTS roles_pkey;
ALTER TABLE IF EXISTS ONLY public.roles DROP CONSTRAINT IF EXISTS roles_name_key;
ALTER TABLE IF EXISTS ONLY public.permissions DROP CONSTRAINT IF EXISTS permissions_pkey;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_pkey;
ALTER TABLE IF EXISTS ONLY public.payment_receipts DROP CONSTRAINT IF EXISTS payment_receipts_pkey;
ALTER TABLE IF EXISTS ONLY public.payment_receipts DROP CONSTRAINT IF EXISTS payment_receipts_payment_id_key;
ALTER TABLE IF EXISTS ONLY public.payment_allocations DROP CONSTRAINT IF EXISTS payment_allocations_pkey;
ALTER TABLE IF EXISTS ONLY public.institutions DROP CONSTRAINT IF EXISTS institutions_pkey;
ALTER TABLE IF EXISTS ONLY public.institutions DROP CONSTRAINT IF EXISTS institutions_code_key;
ALTER TABLE IF EXISTS ONLY public.guardians DROP CONSTRAINT IF EXISTS guardians_pkey;
ALTER TABLE IF EXISTS ONLY public.fee_structures DROP CONSTRAINT IF EXISTS fee_structures_pkey;
ALTER TABLE IF EXISTS ONLY public.fee_register_imports DROP CONSTRAINT IF EXISTS fee_register_imports_pkey;
ALTER TABLE IF EXISTS ONLY public.fee_invoices DROP CONSTRAINT IF EXISTS fee_invoices_pkey;
ALTER TABLE IF EXISTS ONLY public.fee_invoice_items DROP CONSTRAINT IF EXISTS fee_invoice_items_pkey;
ALTER TABLE IF EXISTS ONLY public.fee_installments DROP CONSTRAINT IF EXISTS fee_installments_pkey;
ALTER TABLE IF EXISTS ONLY public.fee_categories DROP CONSTRAINT IF EXISTS fee_categories_pkey;
ALTER TABLE IF EXISTS ONLY public.examinations DROP CONSTRAINT IF EXISTS examinations_pkey;
ALTER TABLE IF EXISTS ONLY public.exam_marks DROP CONSTRAINT IF EXISTS exam_marks_pkey;
ALTER TABLE IF EXISTS ONLY public.divisions DROP CONSTRAINT IF EXISTS divisions_pkey;
ALTER TABLE IF EXISTS ONLY public.discounts DROP CONSTRAINT IF EXISTS discounts_pkey;
ALTER TABLE IF EXISTS ONLY public.data_import_logs DROP CONSTRAINT IF EXISTS data_import_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.boards DROP CONSTRAINT IF EXISTS boards_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.attendances DROP CONSTRAINT IF EXISTS attendances_pkey;
ALTER TABLE IF EXISTS ONLY public.announcements DROP CONSTRAINT IF EXISTS announcements_pkey;
ALTER TABLE IF EXISTS ONLY public.alembic_version DROP CONSTRAINT IF EXISTS alembic_version_pkc;
ALTER TABLE IF EXISTS ONLY public.academic_years DROP CONSTRAINT IF EXISTS academic_years_pkey;
ALTER TABLE IF EXISTS public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.timetable_entries ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.subjects ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.study_materials ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.students ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.student_fee_assignments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.student_enrollments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.student_documents ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.standards ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.scholarships ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.roles ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.permissions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.payments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.payment_receipts ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.payment_allocations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.institutions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.guardians ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.fee_structures ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.fee_register_imports ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.fee_invoices ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.fee_invoice_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.fee_installments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.fee_categories ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.examinations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.exam_marks ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.divisions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.discounts ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.data_import_logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.boards ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.audit_logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.attendances ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.announcements ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.academic_years ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.users_id_seq;
DROP TABLE IF EXISTS public.users;
DROP SEQUENCE IF EXISTS public.timetable_entries_id_seq;
DROP TABLE IF EXISTS public.timetable_entries;
DROP SEQUENCE IF EXISTS public.subjects_id_seq;
DROP TABLE IF EXISTS public.subjects;
DROP SEQUENCE IF EXISTS public.study_materials_id_seq;
DROP TABLE IF EXISTS public.study_materials;
DROP SEQUENCE IF EXISTS public.students_id_seq;
DROP TABLE IF EXISTS public.students;
DROP SEQUENCE IF EXISTS public.student_fee_assignments_id_seq;
DROP TABLE IF EXISTS public.student_fee_assignments;
DROP SEQUENCE IF EXISTS public.student_enrollments_id_seq;
DROP TABLE IF EXISTS public.student_enrollments;
DROP SEQUENCE IF EXISTS public.student_documents_id_seq;
DROP TABLE IF EXISTS public.student_documents;
DROP SEQUENCE IF EXISTS public.standards_id_seq;
DROP TABLE IF EXISTS public.standards;
DROP SEQUENCE IF EXISTS public.scholarships_id_seq;
DROP TABLE IF EXISTS public.scholarships;
DROP SEQUENCE IF EXISTS public.roles_id_seq;
DROP TABLE IF EXISTS public.roles;
DROP SEQUENCE IF EXISTS public.permissions_id_seq;
DROP TABLE IF EXISTS public.permissions;
DROP SEQUENCE IF EXISTS public.payments_id_seq;
DROP TABLE IF EXISTS public.payments;
DROP SEQUENCE IF EXISTS public.payment_receipts_id_seq;
DROP TABLE IF EXISTS public.payment_receipts;
DROP SEQUENCE IF EXISTS public.payment_allocations_id_seq;
DROP TABLE IF EXISTS public.payment_allocations;
DROP SEQUENCE IF EXISTS public.institutions_id_seq;
DROP TABLE IF EXISTS public.institutions;
DROP SEQUENCE IF EXISTS public.guardians_id_seq;
DROP TABLE IF EXISTS public.guardians;
DROP SEQUENCE IF EXISTS public.fee_structures_id_seq;
DROP TABLE IF EXISTS public.fee_structures;
DROP SEQUENCE IF EXISTS public.fee_register_imports_id_seq;
DROP TABLE IF EXISTS public.fee_register_imports;
DROP SEQUENCE IF EXISTS public.fee_invoices_id_seq;
DROP TABLE IF EXISTS public.fee_invoices;
DROP SEQUENCE IF EXISTS public.fee_invoice_items_id_seq;
DROP TABLE IF EXISTS public.fee_invoice_items;
DROP SEQUENCE IF EXISTS public.fee_installments_id_seq;
DROP TABLE IF EXISTS public.fee_installments;
DROP SEQUENCE IF EXISTS public.fee_categories_id_seq;
DROP TABLE IF EXISTS public.fee_categories;
DROP SEQUENCE IF EXISTS public.examinations_id_seq;
DROP TABLE IF EXISTS public.examinations;
DROP SEQUENCE IF EXISTS public.exam_marks_id_seq;
DROP TABLE IF EXISTS public.exam_marks;
DROP SEQUENCE IF EXISTS public.divisions_id_seq;
DROP TABLE IF EXISTS public.divisions;
DROP SEQUENCE IF EXISTS public.discounts_id_seq;
DROP TABLE IF EXISTS public.discounts;
DROP SEQUENCE IF EXISTS public.data_import_logs_id_seq;
DROP TABLE IF EXISTS public.data_import_logs;
DROP SEQUENCE IF EXISTS public.boards_id_seq;
DROP TABLE IF EXISTS public.boards;
DROP SEQUENCE IF EXISTS public.audit_logs_id_seq;
DROP TABLE IF EXISTS public.audit_logs;
DROP SEQUENCE IF EXISTS public.attendances_id_seq;
DROP TABLE IF EXISTS public.attendances;
DROP SEQUENCE IF EXISTS public.announcements_id_seq;
DROP TABLE IF EXISTS public.announcements;
DROP TABLE IF EXISTS public.alembic_version;
DROP SEQUENCE IF EXISTS public.academic_years_id_seq;
DROP TABLE IF EXISTS public.academic_years;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: academic_years; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academic_years (
    id integer NOT NULL,
    institution_id integer NOT NULL,
    name character varying(50) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_current boolean NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: academic_years_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.academic_years_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: academic_years_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.academic_years_id_seq OWNED BY public.academic_years.id;


--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


--
-- Name: announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcements (
    id integer NOT NULL,
    institution_id integer NOT NULL,
    standard_id integer,
    division_id integer,
    title character varying(200) NOT NULL,
    content text NOT NULL,
    category character varying(50) NOT NULL,
    is_pinned boolean NOT NULL,
    publish_date date NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: announcements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.announcements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: announcements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.announcements_id_seq OWNED BY public.announcements.id;


--
-- Name: attendances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendances (
    id integer NOT NULL,
    student_id integer NOT NULL,
    enrollment_id integer NOT NULL,
    date date NOT NULL,
    status character varying(20) NOT NULL,
    remarks character varying(200),
    marked_by_id integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: attendances_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.attendances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: attendances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.attendances_id_seq OWNED BY public.attendances.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id integer,
    action character varying(100) NOT NULL,
    resource_type character varying(100) NOT NULL,
    resource_id integer,
    old_data text,
    new_data text,
    ip_address character varying(50),
    user_agent character varying(500),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: boards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.boards (
    id integer NOT NULL,
    institution_id integer NOT NULL,
    name character varying(50) NOT NULL,
    code character varying(20) NOT NULL,
    description character varying(200),
    is_active boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: boards_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.boards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: boards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.boards_id_seq OWNED BY public.boards.id;


--
-- Name: data_import_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_import_logs (
    id integer NOT NULL,
    institution_id integer NOT NULL,
    academic_year_id integer,
    entity_type character varying(50) NOT NULL,
    import_mode character varying(30) DEFAULT 'create_only'::character varying NOT NULL,
    source_type character varying(20) DEFAULT 'file'::character varying NOT NULL,
    file_name character varying(255),
    total_rows integer DEFAULT 0 NOT NULL,
    successful_rows integer DEFAULT 0 NOT NULL,
    failed_rows integer DEFAULT 0 NOT NULL,
    status character varying(30) DEFAULT 'completed'::character varying NOT NULL,
    error_summary text,
    reconciliation_data text,
    imported_by_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: data_import_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.data_import_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: data_import_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.data_import_logs_id_seq OWNED BY public.data_import_logs.id;


--
-- Name: discounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discounts (
    id integer NOT NULL,
    institution_id integer NOT NULL,
    name character varying(100) NOT NULL,
    discount_type character varying(20) NOT NULL,
    value numeric(12,2) NOT NULL,
    description text,
    is_active boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: discounts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.discounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: discounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.discounts_id_seq OWNED BY public.discounts.id;


--
-- Name: divisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.divisions (
    id integer NOT NULL,
    standard_id integer NOT NULL,
    name character varying(100) NOT NULL,
    capacity integer NOT NULL,
    class_teacher_id integer,
    is_active boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    board_id integer,
    code character varying(50),
    room_number character varying(50),
    schedule_timing character varying(100),
    status character varying(20) DEFAULT 'active'::character varying NOT NULL
);


--
-- Name: divisions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.divisions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: divisions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.divisions_id_seq OWNED BY public.divisions.id;


--
-- Name: exam_marks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_marks (
    id integer NOT NULL,
    examination_id integer NOT NULL,
    student_id integer NOT NULL,
    subject_id integer NOT NULL,
    marks_obtained numeric(6,2),
    grade character varying(5),
    remarks character varying(200),
    is_absent boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: exam_marks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.exam_marks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: exam_marks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.exam_marks_id_seq OWNED BY public.exam_marks.id;


--
-- Name: examinations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.examinations (
    id integer NOT NULL,
    academic_year_id integer NOT NULL,
    standard_id integer NOT NULL,
    name character varying(100) NOT NULL,
    exam_type character varying(50) NOT NULL,
    start_date date,
    end_date date,
    max_marks integer NOT NULL,
    passing_marks integer NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: examinations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.examinations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: examinations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.examinations_id_seq OWNED BY public.examinations.id;


--
-- Name: fee_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fee_categories (
    id integer NOT NULL,
    institution_id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_active boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: fee_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fee_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fee_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fee_categories_id_seq OWNED BY public.fee_categories.id;


--
-- Name: fee_installments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fee_installments (
    id integer NOT NULL,
    invoice_id integer NOT NULL,
    installment_number integer NOT NULL,
    description character varying(200),
    amount numeric(12,2) NOT NULL,
    paid_amount numeric(12,2) NOT NULL,
    due_date date NOT NULL,
    status character varying(20) NOT NULL,
    late_fee_applied numeric(12,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: fee_installments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fee_installments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fee_installments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fee_installments_id_seq OWNED BY public.fee_installments.id;


--
-- Name: fee_invoice_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fee_invoice_items (
    id integer NOT NULL,
    invoice_id integer NOT NULL,
    fee_structure_id integer NOT NULL,
    description character varying(200) NOT NULL,
    amount numeric(12,2) NOT NULL,
    discount_amount numeric(12,2) NOT NULL,
    net_amount numeric(12,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: fee_invoice_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fee_invoice_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fee_invoice_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fee_invoice_items_id_seq OWNED BY public.fee_invoice_items.id;


--
-- Name: fee_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fee_invoices (
    id integer NOT NULL,
    invoice_number character varying(50) NOT NULL,
    student_id integer NOT NULL,
    assignment_id integer NOT NULL,
    academic_year_id integer NOT NULL,
    total_amount numeric(12,2) NOT NULL,
    discount_amount numeric(12,2) NOT NULL,
    net_amount numeric(12,2) NOT NULL,
    paid_amount numeric(12,2) NOT NULL,
    outstanding_amount numeric(12,2) NOT NULL,
    status character varying(20) NOT NULL,
    issue_date date NOT NULL,
    due_date date,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: fee_invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fee_invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fee_invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fee_invoices_id_seq OWNED BY public.fee_invoices.id;


--
-- Name: fee_register_imports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fee_register_imports (
    id integer NOT NULL,
    file_name character varying(255) NOT NULL,
    file_hash character varying(64) NOT NULL,
    academic_year_id integer NOT NULL,
    institution_id integer NOT NULL,
    imported_students_count integer NOT NULL,
    imported_payments_count integer NOT NULL,
    total_fees numeric(12,2) NOT NULL,
    total_collected numeric(12,2) NOT NULL,
    total_outstanding numeric(12,2) NOT NULL,
    reconciliation_summary text,
    status character varying(30) NOT NULL,
    imported_by_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fee_register_imports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fee_register_imports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fee_register_imports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fee_register_imports_id_seq OWNED BY public.fee_register_imports.id;


--
-- Name: fee_structures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fee_structures (
    id integer NOT NULL,
    institution_id integer NOT NULL,
    academic_year_id integer NOT NULL,
    standard_id integer,
    category_id integer NOT NULL,
    name character varying(200) NOT NULL,
    amount numeric(12,2) NOT NULL,
    frequency character varying(20) NOT NULL,
    installments_count integer NOT NULL,
    due_day integer,
    late_fee_amount numeric(12,2) NOT NULL,
    late_fee_days integer NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: fee_structures_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fee_structures_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fee_structures_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fee_structures_id_seq OWNED BY public.fee_structures.id;


--
-- Name: guardians; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.guardians (
    id integer NOT NULL,
    student_id integer NOT NULL,
    relation character varying(50) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    occupation character varying(100),
    phone character varying(20),
    email character varying(200),
    aadhar_number character varying(12),
    annual_income double precision,
    is_primary boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: guardians_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.guardians_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: guardians_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.guardians_id_seq OWNED BY public.guardians.id;


--
-- Name: institutions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.institutions (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    code character varying(50) NOT NULL,
    address text,
    city character varying(100),
    state character varying(100),
    pincode character varying(10),
    phone character varying(20),
    email character varying(200),
    website character varying(200),
    logo_url character varying(500),
    is_active boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.institutions_id_seq OWNED BY public.institutions.id;


--
-- Name: payment_allocations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_allocations (
    id integer NOT NULL,
    payment_id integer NOT NULL,
    invoice_id integer NOT NULL,
    installment_id integer,
    allocated_amount numeric(12,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: payment_allocations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payment_allocations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payment_allocations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payment_allocations_id_seq OWNED BY public.payment_allocations.id;


--
-- Name: payment_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_receipts (
    id integer NOT NULL,
    receipt_number character varying(50) NOT NULL,
    payment_id integer NOT NULL,
    student_id integer NOT NULL,
    amount numeric(12,2) NOT NULL,
    payment_date date NOT NULL,
    payment_method character varying(30) NOT NULL,
    receipt_data text,
    generated_at timestamp with time zone DEFAULT now()
);


--
-- Name: payment_receipts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payment_receipts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payment_receipts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payment_receipts_id_seq OWNED BY public.payment_receipts.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    student_id integer NOT NULL,
    academic_year_id integer NOT NULL,
    amount numeric(12,2) NOT NULL,
    payment_date date NOT NULL,
    payment_method character varying(30) NOT NULL,
    transaction_reference character varying(200),
    bank_name character varying(100),
    cheque_number character varying(50),
    cheque_date date,
    notes text,
    status character varying(20) NOT NULL,
    reversed_at timestamp with time zone,
    reversal_reason text,
    reversed_by_id integer,
    collected_by_id integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    id integer NOT NULL,
    role_id integer NOT NULL,
    resource character varying(100) NOT NULL,
    action character varying(20) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    description character varying(200),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: scholarships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scholarships (
    id integer NOT NULL,
    institution_id integer NOT NULL,
    name character varying(100) NOT NULL,
    amount numeric(12,2) NOT NULL,
    description text,
    is_active boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: scholarships_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.scholarships_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: scholarships_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.scholarships_id_seq OWNED BY public.scholarships.id;


--
-- Name: standards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.standards (
    id integer NOT NULL,
    institution_id integer NOT NULL,
    name character varying(50) NOT NULL,
    level integer NOT NULL,
    description character varying(200),
    is_active boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: standards_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.standards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: standards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.standards_id_seq OWNED BY public.standards.id;


--
-- Name: student_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_documents (
    id integer NOT NULL,
    student_id integer NOT NULL,
    title character varying(200) NOT NULL,
    document_type character varying(50) NOT NULL,
    file_url character varying(500) NOT NULL,
    status character varying(20) NOT NULL,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: student_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.student_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: student_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.student_documents_id_seq OWNED BY public.student_documents.id;


--
-- Name: student_enrollments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_enrollments (
    id integer NOT NULL,
    student_id integer NOT NULL,
    academic_year_id integer NOT NULL,
    standard_id integer NOT NULL,
    division_id integer,
    roll_number character varying(20),
    enrollment_date date NOT NULL,
    status character varying(20) NOT NULL,
    remarks character varying(500),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: student_enrollments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.student_enrollments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: student_enrollments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.student_enrollments_id_seq OWNED BY public.student_enrollments.id;


--
-- Name: student_fee_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_fee_assignments (
    id integer NOT NULL,
    student_id integer NOT NULL,
    fee_structure_id integer NOT NULL,
    academic_year_id integer NOT NULL,
    discount_id integer,
    scholarship_id integer,
    custom_amount numeric(12,2),
    concession_amount numeric(12,2) NOT NULL,
    remarks character varying(500),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: student_fee_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.student_fee_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: student_fee_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.student_fee_assignments_id_seq OWNED BY public.student_fee_assignments.id;


--
-- Name: students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.students (
    id integer NOT NULL,
    institution_id integer NOT NULL,
    admission_number character varying(50) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    middle_name character varying(100),
    date_of_birth date NOT NULL,
    gender character varying(10) NOT NULL,
    blood_group character varying(5),
    nationality character varying(50),
    religion character varying(50),
    caste character varying(50),
    aadhar_number character varying(12),
    photo_url character varying(500),
    address text,
    city character varying(100),
    state character varying(100),
    pincode character varying(10),
    phone character varying(20),
    email character varying(200),
    admission_date date NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: students_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.students_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: students_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.students_id_seq OWNED BY public.students.id;


--
-- Name: study_materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.study_materials (
    id integer NOT NULL,
    institution_id integer NOT NULL,
    standard_id integer NOT NULL,
    subject_id integer NOT NULL,
    division_id integer,
    title character varying(200) NOT NULL,
    description text,
    file_type character varying(20) NOT NULL,
    file_url character varying(500) NOT NULL,
    file_size_bytes integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: study_materials_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.study_materials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: study_materials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.study_materials_id_seq OWNED BY public.study_materials.id;


--
-- Name: subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subjects (
    id integer NOT NULL,
    standard_id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(20),
    max_marks integer NOT NULL,
    pass_marks integer NOT NULL,
    is_optional boolean NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: subjects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subjects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subjects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subjects_id_seq OWNED BY public.subjects.id;


--
-- Name: timetable_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.timetable_entries (
    id integer NOT NULL,
    division_id integer NOT NULL,
    subject_id integer NOT NULL,
    day_of_week character varying(15) NOT NULL,
    start_time character varying(10) NOT NULL,
    end_time character varying(10) NOT NULL,
    room_number character varying(20),
    is_active boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: timetable_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.timetable_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: timetable_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.timetable_entries_id_seq OWNED BY public.timetable_entries.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    institution_id integer,
    username character varying(100) NOT NULL,
    email character varying(200) NOT NULL,
    hashed_password character varying(200) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    phone character varying(20),
    role character varying(50) NOT NULL,
    role_id integer,
    is_active boolean NOT NULL,
    last_login timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    student_id integer,
    invitation_status character varying(30) DEFAULT 'accepted'::character varying NOT NULL,
    invitation_sent_at timestamp with time zone,
    scope_type character varying(30) DEFAULT 'institute'::character varying NOT NULL,
    scope_id integer,
    staff_code character varying(50),
    designation character varying(100)
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: academic_years id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_years ALTER COLUMN id SET DEFAULT nextval('public.academic_years_id_seq'::regclass);


--
-- Name: announcements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements ALTER COLUMN id SET DEFAULT nextval('public.announcements_id_seq'::regclass);


--
-- Name: attendances id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendances ALTER COLUMN id SET DEFAULT nextval('public.attendances_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: boards id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boards ALTER COLUMN id SET DEFAULT nextval('public.boards_id_seq'::regclass);


--
-- Name: data_import_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_import_logs ALTER COLUMN id SET DEFAULT nextval('public.data_import_logs_id_seq'::regclass);


--
-- Name: discounts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discounts ALTER COLUMN id SET DEFAULT nextval('public.discounts_id_seq'::regclass);


--
-- Name: divisions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.divisions ALTER COLUMN id SET DEFAULT nextval('public.divisions_id_seq'::regclass);


--
-- Name: exam_marks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_marks ALTER COLUMN id SET DEFAULT nextval('public.exam_marks_id_seq'::regclass);


--
-- Name: examinations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.examinations ALTER COLUMN id SET DEFAULT nextval('public.examinations_id_seq'::regclass);


--
-- Name: fee_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_categories ALTER COLUMN id SET DEFAULT nextval('public.fee_categories_id_seq'::regclass);


--
-- Name: fee_installments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_installments ALTER COLUMN id SET DEFAULT nextval('public.fee_installments_id_seq'::regclass);


--
-- Name: fee_invoice_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_invoice_items ALTER COLUMN id SET DEFAULT nextval('public.fee_invoice_items_id_seq'::regclass);


--
-- Name: fee_invoices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_invoices ALTER COLUMN id SET DEFAULT nextval('public.fee_invoices_id_seq'::regclass);


--
-- Name: fee_register_imports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_register_imports ALTER COLUMN id SET DEFAULT nextval('public.fee_register_imports_id_seq'::regclass);


--
-- Name: fee_structures id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_structures ALTER COLUMN id SET DEFAULT nextval('public.fee_structures_id_seq'::regclass);


--
-- Name: guardians id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guardians ALTER COLUMN id SET DEFAULT nextval('public.guardians_id_seq'::regclass);


--
-- Name: institutions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institutions ALTER COLUMN id SET DEFAULT nextval('public.institutions_id_seq'::regclass);


--
-- Name: payment_allocations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_allocations ALTER COLUMN id SET DEFAULT nextval('public.payment_allocations_id_seq'::regclass);


--
-- Name: payment_receipts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_receipts ALTER COLUMN id SET DEFAULT nextval('public.payment_receipts_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: scholarships id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scholarships ALTER COLUMN id SET DEFAULT nextval('public.scholarships_id_seq'::regclass);


--
-- Name: standards id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.standards ALTER COLUMN id SET DEFAULT nextval('public.standards_id_seq'::regclass);


--
-- Name: student_documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_documents ALTER COLUMN id SET DEFAULT nextval('public.student_documents_id_seq'::regclass);


--
-- Name: student_enrollments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_enrollments ALTER COLUMN id SET DEFAULT nextval('public.student_enrollments_id_seq'::regclass);


--
-- Name: student_fee_assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_fee_assignments ALTER COLUMN id SET DEFAULT nextval('public.student_fee_assignments_id_seq'::regclass);


--
-- Name: students id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students ALTER COLUMN id SET DEFAULT nextval('public.students_id_seq'::regclass);


--
-- Name: study_materials id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_materials ALTER COLUMN id SET DEFAULT nextval('public.study_materials_id_seq'::regclass);


--
-- Name: subjects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects ALTER COLUMN id SET DEFAULT nextval('public.subjects_id_seq'::regclass);


--
-- Name: timetable_entries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_entries ALTER COLUMN id SET DEFAULT nextval('public.timetable_entries_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: academic_years; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.academic_years (id, institution_id, name, start_date, end_date, is_current, is_active, created_at, updated_at) FROM stdin;
3	2	2023-24	2023-06-01	2024-03-31	f	t	2026-11-03 18:17:09.293778+00	2026-11-03 18:17:09.293778+00
1	2	2026 - 27	2024-06-01	2025-03-31	t	t	2026-11-03 15:17:26.3504+00	2026-11-04 08:30:52.520916+00
\.


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.alembic_version (version_num) FROM stdin;
010_curriculum_timetable
\.


--
-- Data for Name: announcements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.announcements (id, institution_id, standard_id, division_id, title, content, category, is_pinned, publish_date, created_at) FROM stdin;
7	2	\N	\N	Annual Term Examination 2024-25 Schedule Announced	The Term 1 examinations for ICSE, CBSE, and SSC batches will commence from October 15, 2024. Hall tickets and seating layout are available on the student notice board.	examination	t	2024-09-25	2026-11-04 14:26:35.769607+00
8	2	\N	\N	Parent-Teacher Interactive Meeting & Progress Report Release	Quarterly Parent-Teacher Meeting will be held this Saturday between 10:00 AM and 1:00 PM. Parents are requested to collect student academic performance portfolios.	general	t	2024-10-05	2026-11-04 14:26:35.769607+00
9	2	\N	\N	Diwali Vacation & Special Board Revision Batch	The academy will observe Diwali break from October 30 to November 5, 2024. Standard X ICSE and CBSE fast-track revision lectures will continue online.	holiday	t	2024-10-20	2026-11-04 14:26:35.769607+00
10	2	\N	\N	Trigonometry & Calculus Masterclass Workshop	Intensive problem-solving workshop covering trigonometric identities and height & distance numericals for Standard X students this Sunday in Hall 101.	academic	f	2024-10-12	2026-11-04 14:26:35.769607+00
\.


--
-- Data for Name: attendances; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.attendances (id, student_id, enrollment_id, date, status, remarks, marked_by_id, created_at) FROM stdin;
1951	156	156	2024-08-02	present	Present	1	2026-11-04 14:26:35.769607+00
1952	163	163	2024-08-02	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
1953	167	167	2024-08-02	present	Present	1	2026-11-04 14:26:35.769607+00
1954	155	155	2024-08-02	present	Present	1	2026-11-04 14:26:35.769607+00
1955	129	129	2024-08-02	present	Present	1	2026-11-04 14:26:35.769607+00
1956	130	130	2024-08-02	present	Present	1	2026-11-04 14:26:35.769607+00
1957	131	131	2024-08-02	present	Present	1	2026-11-04 14:26:35.769607+00
1958	132	132	2024-08-02	present	Present	1	2026-11-04 14:26:35.769607+00
1959	133	133	2024-08-02	present	Present	1	2026-11-04 14:26:35.769607+00
1960	134	134	2024-08-02	present	Present	1	2026-11-04 14:26:35.769607+00
1961	135	135	2024-08-02	present	Present	1	2026-11-04 14:26:35.769607+00
1962	136	136	2024-08-02	present	Present	1	2026-11-04 14:26:35.769607+00
1963	138	138	2024-08-02	present	Present	1	2026-11-04 14:26:35.769607+00
1964	139	139	2024-08-02	present	Present	1	2026-11-04 14:26:35.769607+00
1965	140	140	2024-08-02	present	Present	1	2026-11-04 14:26:35.769607+00
1966	141	141	2024-08-02	present	Present	1	2026-11-04 14:26:35.769607+00
1967	137	137	2024-08-02	present	Present	1	2026-11-04 14:26:35.769607+00
1968	157	157	2024-08-02	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
1969	158	158	2024-08-02	present	Present	1	2026-11-04 14:26:35.769607+00
1970	159	159	2024-08-02	present	Present	1	2026-11-04 14:26:35.769607+00
1971	160	160	2024-08-02	present	Present	1	2026-11-04 14:26:35.769607+00
1972	161	161	2024-08-02	present	Present	1	2026-11-04 14:26:35.769607+00
1973	162	162	2024-08-02	present	Present	1	2026-11-04 14:26:35.769607+00
1974	164	164	2024-08-02	present	Present	1	2026-11-04 14:26:35.769607+00
1975	165	165	2024-08-02	present	Present	1	2026-11-04 14:26:35.769607+00
1976	166	166	2024-08-02	present	Present	1	2026-11-04 14:26:35.769607+00
1977	142	142	2024-08-02	present	Present	1	2026-11-04 14:26:35.769607+00
1978	143	143	2024-08-02	present	Present	1	2026-11-04 14:26:35.769607+00
1979	144	144	2024-08-02	present	Present	1	2026-11-04 14:26:35.769607+00
1980	145	145	2024-08-02	present	Present	1	2026-11-04 14:26:35.769607+00
1981	146	146	2024-08-02	present	Present	1	2026-11-04 14:26:35.769607+00
1982	147	147	2024-08-02	present	Present	1	2026-11-04 14:26:35.769607+00
1983	148	148	2024-08-02	present	Present	1	2026-11-04 14:26:35.769607+00
1984	149	149	2024-08-02	present	Present	1	2026-11-04 14:26:35.769607+00
1985	150	150	2024-08-02	present	Present	1	2026-11-04 14:26:35.769607+00
1986	151	151	2024-08-02	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
1987	152	152	2024-08-02	present	Present	1	2026-11-04 14:26:35.769607+00
1988	153	153	2024-08-02	present	Present	1	2026-11-04 14:26:35.769607+00
1989	154	154	2024-08-02	present	Present	1	2026-11-04 14:26:35.769607+00
1990	156	156	2024-08-03	present	Present	1	2026-11-04 14:26:35.769607+00
1991	163	163	2024-08-03	present	Present	1	2026-11-04 14:26:35.769607+00
1992	167	167	2024-08-03	present	Present	1	2026-11-04 14:26:35.769607+00
1993	155	155	2024-08-03	present	Present	1	2026-11-04 14:26:35.769607+00
1994	129	129	2024-08-03	present	Present	1	2026-11-04 14:26:35.769607+00
1995	130	130	2024-08-03	present	Present	1	2026-11-04 14:26:35.769607+00
1996	131	131	2024-08-03	present	Present	1	2026-11-04 14:26:35.769607+00
1997	132	132	2024-08-03	present	Present	1	2026-11-04 14:26:35.769607+00
1998	133	133	2024-08-03	present	Present	1	2026-11-04 14:26:35.769607+00
1999	134	134	2024-08-03	present	Present	1	2026-11-04 14:26:35.769607+00
2000	135	135	2024-08-03	present	Present	1	2026-11-04 14:26:35.769607+00
2001	136	136	2024-08-03	present	Present	1	2026-11-04 14:26:35.769607+00
2002	138	138	2024-08-03	present	Present	1	2026-11-04 14:26:35.769607+00
2003	139	139	2024-08-03	present	Present	1	2026-11-04 14:26:35.769607+00
2004	140	140	2024-08-03	present	Present	1	2026-11-04 14:26:35.769607+00
2005	141	141	2024-08-03	present	Present	1	2026-11-04 14:26:35.769607+00
2006	137	137	2024-08-03	present	Present	1	2026-11-04 14:26:35.769607+00
2007	157	157	2024-08-03	present	Present	1	2026-11-04 14:26:35.769607+00
2008	158	158	2024-08-03	present	Present	1	2026-11-04 14:26:35.769607+00
2009	159	159	2024-08-03	present	Present	1	2026-11-04 14:26:35.769607+00
2010	160	160	2024-08-03	present	Present	1	2026-11-04 14:26:35.769607+00
2011	161	161	2024-08-03	present	Present	1	2026-11-04 14:26:35.769607+00
2012	162	162	2024-08-03	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2013	164	164	2024-08-03	present	Present	1	2026-11-04 14:26:35.769607+00
2014	165	165	2024-08-03	present	Present	1	2026-11-04 14:26:35.769607+00
2015	166	166	2024-08-03	present	Present	1	2026-11-04 14:26:35.769607+00
2016	142	142	2024-08-03	present	Present	1	2026-11-04 14:26:35.769607+00
2017	143	143	2024-08-03	present	Present	1	2026-11-04 14:26:35.769607+00
2018	144	144	2024-08-03	present	Present	1	2026-11-04 14:26:35.769607+00
2019	145	145	2024-08-03	present	Present	1	2026-11-04 14:26:35.769607+00
2020	146	146	2024-08-03	present	Present	1	2026-11-04 14:26:35.769607+00
2021	147	147	2024-08-03	present	Present	1	2026-11-04 14:26:35.769607+00
2022	148	148	2024-08-03	present	Present	1	2026-11-04 14:26:35.769607+00
2023	149	149	2024-08-03	present	Present	1	2026-11-04 14:26:35.769607+00
2024	150	150	2024-08-03	present	Present	1	2026-11-04 14:26:35.769607+00
2025	151	151	2024-08-03	present	Present	1	2026-11-04 14:26:35.769607+00
2026	152	152	2024-08-03	present	Present	1	2026-11-04 14:26:35.769607+00
2027	153	153	2024-08-03	present	Present	1	2026-11-04 14:26:35.769607+00
2028	154	154	2024-08-03	present	Present	1	2026-11-04 14:26:35.769607+00
2029	156	156	2024-08-05	present	Present	1	2026-11-04 14:26:35.769607+00
2030	163	163	2024-08-05	present	Present	1	2026-11-04 14:26:35.769607+00
2031	167	167	2024-08-05	present	Present	1	2026-11-04 14:26:35.769607+00
2032	155	155	2024-08-05	present	Present	1	2026-11-04 14:26:35.769607+00
2033	129	129	2024-08-05	present	Present	1	2026-11-04 14:26:35.769607+00
2034	130	130	2024-08-05	present	Present	1	2026-11-04 14:26:35.769607+00
2035	131	131	2024-08-05	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2036	132	132	2024-08-05	present	Present	1	2026-11-04 14:26:35.769607+00
2037	133	133	2024-08-05	present	Present	1	2026-11-04 14:26:35.769607+00
2038	134	134	2024-08-05	present	Present	1	2026-11-04 14:26:35.769607+00
2039	135	135	2024-08-05	present	Present	1	2026-11-04 14:26:35.769607+00
2040	136	136	2024-08-05	present	Present	1	2026-11-04 14:26:35.769607+00
2041	138	138	2024-08-05	present	Present	1	2026-11-04 14:26:35.769607+00
2042	139	139	2024-08-05	present	Present	1	2026-11-04 14:26:35.769607+00
2043	140	140	2024-08-05	present	Present	1	2026-11-04 14:26:35.769607+00
2044	141	141	2024-08-05	present	Present	1	2026-11-04 14:26:35.769607+00
2045	137	137	2024-08-05	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2046	157	157	2024-08-05	present	Present	1	2026-11-04 14:26:35.769607+00
2047	158	158	2024-08-05	present	Present	1	2026-11-04 14:26:35.769607+00
2048	159	159	2024-08-05	present	Present	1	2026-11-04 14:26:35.769607+00
2049	160	160	2024-08-05	present	Present	1	2026-11-04 14:26:35.769607+00
2050	161	161	2024-08-05	present	Present	1	2026-11-04 14:26:35.769607+00
2051	162	162	2024-08-05	present	Present	1	2026-11-04 14:26:35.769607+00
2052	164	164	2024-08-05	present	Present	1	2026-11-04 14:26:35.769607+00
2053	165	165	2024-08-05	present	Present	1	2026-11-04 14:26:35.769607+00
2054	166	166	2024-08-05	present	Present	1	2026-11-04 14:26:35.769607+00
2055	142	142	2024-08-05	present	Present	1	2026-11-04 14:26:35.769607+00
2056	143	143	2024-08-05	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2057	144	144	2024-08-05	present	Present	1	2026-11-04 14:26:35.769607+00
2058	145	145	2024-08-05	present	Present	1	2026-11-04 14:26:35.769607+00
2059	146	146	2024-08-05	present	Present	1	2026-11-04 14:26:35.769607+00
2060	147	147	2024-08-05	present	Present	1	2026-11-04 14:26:35.769607+00
2061	148	148	2024-08-05	present	Present	1	2026-11-04 14:26:35.769607+00
2062	149	149	2024-08-05	late	Late by 10 mins	1	2026-11-04 14:26:35.769607+00
2063	150	150	2024-08-05	present	Present	1	2026-11-04 14:26:35.769607+00
2064	151	151	2024-08-05	present	Present	1	2026-11-04 14:26:35.769607+00
2065	152	152	2024-08-05	present	Present	1	2026-11-04 14:26:35.769607+00
2066	153	153	2024-08-05	present	Present	1	2026-11-04 14:26:35.769607+00
2067	154	154	2024-08-05	present	Present	1	2026-11-04 14:26:35.769607+00
2068	156	156	2024-08-07	present	Present	1	2026-11-04 14:26:35.769607+00
2069	163	163	2024-08-07	present	Present	1	2026-11-04 14:26:35.769607+00
2070	167	167	2024-08-07	present	Present	1	2026-11-04 14:26:35.769607+00
2071	155	155	2024-08-07	present	Present	1	2026-11-04 14:26:35.769607+00
2072	129	129	2024-08-07	present	Present	1	2026-11-04 14:26:35.769607+00
2073	130	130	2024-08-07	present	Present	1	2026-11-04 14:26:35.769607+00
2074	131	131	2024-08-07	present	Present	1	2026-11-04 14:26:35.769607+00
2075	132	132	2024-08-07	present	Present	1	2026-11-04 14:26:35.769607+00
2076	133	133	2024-08-07	present	Present	1	2026-11-04 14:26:35.769607+00
2077	134	134	2024-08-07	present	Present	1	2026-11-04 14:26:35.769607+00
2078	135	135	2024-08-07	present	Present	1	2026-11-04 14:26:35.769607+00
2079	136	136	2024-08-07	present	Present	1	2026-11-04 14:26:35.769607+00
2080	138	138	2024-08-07	present	Present	1	2026-11-04 14:26:35.769607+00
2081	139	139	2024-08-07	present	Present	1	2026-11-04 14:26:35.769607+00
2082	140	140	2024-08-07	present	Present	1	2026-11-04 14:26:35.769607+00
2083	141	141	2024-08-07	present	Present	1	2026-11-04 14:26:35.769607+00
2084	137	137	2024-08-07	present	Present	1	2026-11-04 14:26:35.769607+00
2085	157	157	2024-08-07	present	Present	1	2026-11-04 14:26:35.769607+00
2086	158	158	2024-08-07	present	Present	1	2026-11-04 14:26:35.769607+00
2087	159	159	2024-08-07	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2088	160	160	2024-08-07	present	Present	1	2026-11-04 14:26:35.769607+00
2089	161	161	2024-08-07	present	Present	1	2026-11-04 14:26:35.769607+00
2090	162	162	2024-08-07	present	Present	1	2026-11-04 14:26:35.769607+00
2091	164	164	2024-08-07	present	Present	1	2026-11-04 14:26:35.769607+00
2092	165	165	2024-08-07	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2093	166	166	2024-08-07	present	Present	1	2026-11-04 14:26:35.769607+00
2094	142	142	2024-08-07	present	Present	1	2026-11-04 14:26:35.769607+00
2095	143	143	2024-08-07	present	Present	1	2026-11-04 14:26:35.769607+00
2096	144	144	2024-08-07	present	Present	1	2026-11-04 14:26:35.769607+00
2097	145	145	2024-08-07	present	Present	1	2026-11-04 14:26:35.769607+00
2098	146	146	2024-08-07	present	Present	1	2026-11-04 14:26:35.769607+00
2099	147	147	2024-08-07	present	Present	1	2026-11-04 14:26:35.769607+00
2100	148	148	2024-08-07	present	Present	1	2026-11-04 14:26:35.769607+00
2101	149	149	2024-08-07	present	Present	1	2026-11-04 14:26:35.769607+00
2102	150	150	2024-08-07	present	Present	1	2026-11-04 14:26:35.769607+00
2103	151	151	2024-08-07	present	Present	1	2026-11-04 14:26:35.769607+00
2104	152	152	2024-08-07	present	Present	1	2026-11-04 14:26:35.769607+00
2105	153	153	2024-08-07	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2106	154	154	2024-08-07	present	Present	1	2026-11-04 14:26:35.769607+00
2107	156	156	2024-08-09	present	Present	1	2026-11-04 14:26:35.769607+00
2108	163	163	2024-08-09	present	Present	1	2026-11-04 14:26:35.769607+00
2109	167	167	2024-08-09	present	Present	1	2026-11-04 14:26:35.769607+00
2110	155	155	2024-08-09	present	Present	1	2026-11-04 14:26:35.769607+00
2111	129	129	2024-08-09	present	Present	1	2026-11-04 14:26:35.769607+00
2112	130	130	2024-08-09	present	Present	1	2026-11-04 14:26:35.769607+00
2113	131	131	2024-08-09	present	Present	1	2026-11-04 14:26:35.769607+00
2114	132	132	2024-08-09	present	Present	1	2026-11-04 14:26:35.769607+00
2115	133	133	2024-08-09	present	Present	1	2026-11-04 14:26:35.769607+00
2116	134	134	2024-08-09	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2117	135	135	2024-08-09	present	Present	1	2026-11-04 14:26:35.769607+00
2118	136	136	2024-08-09	present	Present	1	2026-11-04 14:26:35.769607+00
2119	138	138	2024-08-09	present	Present	1	2026-11-04 14:26:35.769607+00
2120	139	139	2024-08-09	present	Present	1	2026-11-04 14:26:35.769607+00
2121	140	140	2024-08-09	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2122	141	141	2024-08-09	present	Present	1	2026-11-04 14:26:35.769607+00
2123	137	137	2024-08-09	present	Present	1	2026-11-04 14:26:35.769607+00
2124	157	157	2024-08-09	present	Present	1	2026-11-04 14:26:35.769607+00
2125	158	158	2024-08-09	present	Present	1	2026-11-04 14:26:35.769607+00
2126	159	159	2024-08-09	present	Present	1	2026-11-04 14:26:35.769607+00
2127	160	160	2024-08-09	present	Present	1	2026-11-04 14:26:35.769607+00
2128	161	161	2024-08-09	present	Present	1	2026-11-04 14:26:35.769607+00
2129	162	162	2024-08-09	present	Present	1	2026-11-04 14:26:35.769607+00
2130	164	164	2024-08-09	present	Present	1	2026-11-04 14:26:35.769607+00
2131	165	165	2024-08-09	present	Present	1	2026-11-04 14:26:35.769607+00
2132	166	166	2024-08-09	present	Present	1	2026-11-04 14:26:35.769607+00
2133	142	142	2024-08-09	present	Present	1	2026-11-04 14:26:35.769607+00
2134	143	143	2024-08-09	present	Present	1	2026-11-04 14:26:35.769607+00
2135	144	144	2024-08-09	present	Present	1	2026-11-04 14:26:35.769607+00
2136	145	145	2024-08-09	present	Present	1	2026-11-04 14:26:35.769607+00
2137	146	146	2024-08-09	late	Late by 10 mins	1	2026-11-04 14:26:35.769607+00
2138	147	147	2024-08-09	present	Present	1	2026-11-04 14:26:35.769607+00
2139	148	148	2024-08-09	present	Present	1	2026-11-04 14:26:35.769607+00
2140	149	149	2024-08-09	present	Present	1	2026-11-04 14:26:35.769607+00
2141	150	150	2024-08-09	present	Present	1	2026-11-04 14:26:35.769607+00
2142	151	151	2024-08-09	present	Present	1	2026-11-04 14:26:35.769607+00
2143	152	152	2024-08-09	present	Present	1	2026-11-04 14:26:35.769607+00
2144	153	153	2024-08-09	present	Present	1	2026-11-04 14:26:35.769607+00
2145	154	154	2024-08-09	present	Present	1	2026-11-04 14:26:35.769607+00
2146	156	156	2024-08-10	present	Present	1	2026-11-04 14:26:35.769607+00
2147	163	163	2024-08-10	present	Present	1	2026-11-04 14:26:35.769607+00
2148	167	167	2024-08-10	present	Present	1	2026-11-04 14:26:35.769607+00
2149	155	155	2024-08-10	present	Present	1	2026-11-04 14:26:35.769607+00
2150	129	129	2024-08-10	present	Present	1	2026-11-04 14:26:35.769607+00
2151	130	130	2024-08-10	present	Present	1	2026-11-04 14:26:35.769607+00
2152	131	131	2024-08-10	present	Present	1	2026-11-04 14:26:35.769607+00
2153	132	132	2024-08-10	present	Present	1	2026-11-04 14:26:35.769607+00
2154	133	133	2024-08-10	present	Present	1	2026-11-04 14:26:35.769607+00
2155	134	134	2024-08-10	present	Present	1	2026-11-04 14:26:35.769607+00
2156	135	135	2024-08-10	present	Present	1	2026-11-04 14:26:35.769607+00
2157	136	136	2024-08-10	present	Present	1	2026-11-04 14:26:35.769607+00
2158	138	138	2024-08-10	present	Present	1	2026-11-04 14:26:35.769607+00
2159	139	139	2024-08-10	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2160	140	140	2024-08-10	present	Present	1	2026-11-04 14:26:35.769607+00
2161	141	141	2024-08-10	present	Present	1	2026-11-04 14:26:35.769607+00
2162	137	137	2024-08-10	present	Present	1	2026-11-04 14:26:35.769607+00
2163	157	157	2024-08-10	late	Late by 10 mins	1	2026-11-04 14:26:35.769607+00
2164	158	158	2024-08-10	present	Present	1	2026-11-04 14:26:35.769607+00
2165	159	159	2024-08-10	present	Present	1	2026-11-04 14:26:35.769607+00
2166	160	160	2024-08-10	present	Present	1	2026-11-04 14:26:35.769607+00
2167	161	161	2024-08-10	present	Present	1	2026-11-04 14:26:35.769607+00
2168	162	162	2024-08-10	present	Present	1	2026-11-04 14:26:35.769607+00
2169	164	164	2024-08-10	present	Present	1	2026-11-04 14:26:35.769607+00
2170	165	165	2024-08-10	present	Present	1	2026-11-04 14:26:35.769607+00
2171	166	166	2024-08-10	present	Present	1	2026-11-04 14:26:35.769607+00
2172	142	142	2024-08-10	present	Present	1	2026-11-04 14:26:35.769607+00
2173	143	143	2024-08-10	present	Present	1	2026-11-04 14:26:35.769607+00
2174	144	144	2024-08-10	present	Present	1	2026-11-04 14:26:35.769607+00
2175	145	145	2024-08-10	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2176	146	146	2024-08-10	present	Present	1	2026-11-04 14:26:35.769607+00
2177	147	147	2024-08-10	present	Present	1	2026-11-04 14:26:35.769607+00
2178	148	148	2024-08-10	present	Present	1	2026-11-04 14:26:35.769607+00
2179	149	149	2024-08-10	present	Present	1	2026-11-04 14:26:35.769607+00
2180	150	150	2024-08-10	present	Present	1	2026-11-04 14:26:35.769607+00
2181	151	151	2024-08-10	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2182	152	152	2024-08-10	present	Present	1	2026-11-04 14:26:35.769607+00
2183	153	153	2024-08-10	present	Present	1	2026-11-04 14:26:35.769607+00
2184	154	154	2024-08-10	present	Present	1	2026-11-04 14:26:35.769607+00
2185	156	156	2024-08-12	present	Present	1	2026-11-04 14:26:35.769607+00
2186	163	163	2024-08-12	present	Present	1	2026-11-04 14:26:35.769607+00
2187	167	167	2024-08-12	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2188	155	155	2024-08-12	present	Present	1	2026-11-04 14:26:35.769607+00
2189	129	129	2024-08-12	present	Present	1	2026-11-04 14:26:35.769607+00
2190	130	130	2024-08-12	present	Present	1	2026-11-04 14:26:35.769607+00
2191	131	131	2024-08-12	present	Present	1	2026-11-04 14:26:35.769607+00
2192	132	132	2024-08-12	present	Present	1	2026-11-04 14:26:35.769607+00
2193	133	133	2024-08-12	present	Present	1	2026-11-04 14:26:35.769607+00
2194	134	134	2024-08-12	present	Present	1	2026-11-04 14:26:35.769607+00
2195	135	135	2024-08-12	present	Present	1	2026-11-04 14:26:35.769607+00
2196	136	136	2024-08-12	present	Present	1	2026-11-04 14:26:35.769607+00
2197	138	138	2024-08-12	present	Present	1	2026-11-04 14:26:35.769607+00
2198	139	139	2024-08-12	present	Present	1	2026-11-04 14:26:35.769607+00
2199	140	140	2024-08-12	present	Present	1	2026-11-04 14:26:35.769607+00
2200	141	141	2024-08-12	present	Present	1	2026-11-04 14:26:35.769607+00
2201	137	137	2024-08-12	present	Present	1	2026-11-04 14:26:35.769607+00
2202	157	157	2024-08-12	present	Present	1	2026-11-04 14:26:35.769607+00
2203	158	158	2024-08-12	present	Present	1	2026-11-04 14:26:35.769607+00
2204	159	159	2024-08-12	present	Present	1	2026-11-04 14:26:35.769607+00
2205	160	160	2024-08-12	present	Present	1	2026-11-04 14:26:35.769607+00
2206	161	161	2024-08-12	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2207	162	162	2024-08-12	present	Present	1	2026-11-04 14:26:35.769607+00
2208	164	164	2024-08-12	present	Present	1	2026-11-04 14:26:35.769607+00
2209	165	165	2024-08-12	present	Present	1	2026-11-04 14:26:35.769607+00
2210	166	166	2024-08-12	present	Present	1	2026-11-04 14:26:35.769607+00
2211	142	142	2024-08-12	present	Present	1	2026-11-04 14:26:35.769607+00
2212	143	143	2024-08-12	present	Present	1	2026-11-04 14:26:35.769607+00
2213	144	144	2024-08-12	present	Present	1	2026-11-04 14:26:35.769607+00
2214	145	145	2024-08-12	present	Present	1	2026-11-04 14:26:35.769607+00
2215	146	146	2024-08-12	present	Present	1	2026-11-04 14:26:35.769607+00
2216	147	147	2024-08-12	present	Present	1	2026-11-04 14:26:35.769607+00
2217	148	148	2024-08-12	present	Present	1	2026-11-04 14:26:35.769607+00
2218	149	149	2024-08-12	present	Present	1	2026-11-04 14:26:35.769607+00
2219	150	150	2024-08-12	present	Present	1	2026-11-04 14:26:35.769607+00
2220	151	151	2024-08-12	present	Present	1	2026-11-04 14:26:35.769607+00
2221	152	152	2024-08-12	present	Present	1	2026-11-04 14:26:35.769607+00
2222	153	153	2024-08-12	present	Present	1	2026-11-04 14:26:35.769607+00
2223	154	154	2024-08-12	present	Present	1	2026-11-04 14:26:35.769607+00
2224	156	156	2024-08-14	present	Present	1	2026-11-04 14:26:35.769607+00
2225	163	163	2024-08-14	present	Present	1	2026-11-04 14:26:35.769607+00
2226	167	167	2024-08-14	present	Present	1	2026-11-04 14:26:35.769607+00
2227	155	155	2024-08-14	present	Present	1	2026-11-04 14:26:35.769607+00
2228	129	129	2024-08-14	present	Present	1	2026-11-04 14:26:35.769607+00
2229	130	130	2024-08-14	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2230	131	131	2024-08-14	present	Present	1	2026-11-04 14:26:35.769607+00
2231	132	132	2024-08-14	present	Present	1	2026-11-04 14:26:35.769607+00
2232	133	133	2024-08-14	present	Present	1	2026-11-04 14:26:35.769607+00
2233	134	134	2024-08-14	present	Present	1	2026-11-04 14:26:35.769607+00
2234	135	135	2024-08-14	present	Present	1	2026-11-04 14:26:35.769607+00
2235	136	136	2024-08-14	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2236	138	138	2024-08-14	present	Present	1	2026-11-04 14:26:35.769607+00
2237	139	139	2024-08-14	present	Present	1	2026-11-04 14:26:35.769607+00
2238	140	140	2024-08-14	present	Present	1	2026-11-04 14:26:35.769607+00
2239	141	141	2024-08-14	present	Present	1	2026-11-04 14:26:35.769607+00
2240	137	137	2024-08-14	present	Present	1	2026-11-04 14:26:35.769607+00
2241	157	157	2024-08-14	present	Present	1	2026-11-04 14:26:35.769607+00
2242	158	158	2024-08-14	present	Present	1	2026-11-04 14:26:35.769607+00
2243	159	159	2024-08-14	present	Present	1	2026-11-04 14:26:35.769607+00
2244	160	160	2024-08-14	present	Present	1	2026-11-04 14:26:35.769607+00
2245	161	161	2024-08-14	present	Present	1	2026-11-04 14:26:35.769607+00
2246	162	162	2024-08-14	present	Present	1	2026-11-04 14:26:35.769607+00
2247	164	164	2024-08-14	present	Present	1	2026-11-04 14:26:35.769607+00
2248	165	165	2024-08-14	present	Present	1	2026-11-04 14:26:35.769607+00
2249	166	166	2024-08-14	present	Present	1	2026-11-04 14:26:35.769607+00
2250	142	142	2024-08-14	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2251	143	143	2024-08-14	present	Present	1	2026-11-04 14:26:35.769607+00
2252	144	144	2024-08-14	present	Present	1	2026-11-04 14:26:35.769607+00
2253	145	145	2024-08-14	present	Present	1	2026-11-04 14:26:35.769607+00
2254	146	146	2024-08-14	present	Present	1	2026-11-04 14:26:35.769607+00
2255	147	147	2024-08-14	present	Present	1	2026-11-04 14:26:35.769607+00
2256	148	148	2024-08-14	late	Late by 10 mins	1	2026-11-04 14:26:35.769607+00
2257	149	149	2024-08-14	present	Present	1	2026-11-04 14:26:35.769607+00
2258	150	150	2024-08-14	present	Present	1	2026-11-04 14:26:35.769607+00
2259	151	151	2024-08-14	present	Present	1	2026-11-04 14:26:35.769607+00
2260	152	152	2024-08-14	present	Present	1	2026-11-04 14:26:35.769607+00
2261	153	153	2024-08-14	present	Present	1	2026-11-04 14:26:35.769607+00
2262	154	154	2024-08-14	present	Present	1	2026-11-04 14:26:35.769607+00
2263	156	156	2024-08-16	present	Present	1	2026-11-04 14:26:35.769607+00
2264	163	163	2024-08-16	present	Present	1	2026-11-04 14:26:35.769607+00
2265	167	167	2024-08-16	present	Present	1	2026-11-04 14:26:35.769607+00
2266	155	155	2024-08-16	present	Present	1	2026-11-04 14:26:35.769607+00
2267	129	129	2024-08-16	present	Present	1	2026-11-04 14:26:35.769607+00
2268	130	130	2024-08-16	present	Present	1	2026-11-04 14:26:35.769607+00
2269	131	131	2024-08-16	present	Present	1	2026-11-04 14:26:35.769607+00
2270	132	132	2024-08-16	present	Present	1	2026-11-04 14:26:35.769607+00
2271	133	133	2024-08-16	present	Present	1	2026-11-04 14:26:35.769607+00
2272	134	134	2024-08-16	present	Present	1	2026-11-04 14:26:35.769607+00
2273	135	135	2024-08-16	present	Present	1	2026-11-04 14:26:35.769607+00
2274	136	136	2024-08-16	present	Present	1	2026-11-04 14:26:35.769607+00
2275	138	138	2024-08-16	present	Present	1	2026-11-04 14:26:35.769607+00
2276	139	139	2024-08-16	present	Present	1	2026-11-04 14:26:35.769607+00
2277	140	140	2024-08-16	present	Present	1	2026-11-04 14:26:35.769607+00
2278	141	141	2024-08-16	present	Present	1	2026-11-04 14:26:35.769607+00
2279	137	137	2024-08-16	present	Present	1	2026-11-04 14:26:35.769607+00
2280	157	157	2024-08-16	present	Present	1	2026-11-04 14:26:35.769607+00
2281	158	158	2024-08-16	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2282	159	159	2024-08-16	present	Present	1	2026-11-04 14:26:35.769607+00
2283	160	160	2024-08-16	present	Present	1	2026-11-04 14:26:35.769607+00
2284	161	161	2024-08-16	present	Present	1	2026-11-04 14:26:35.769607+00
2285	162	162	2024-08-16	present	Present	1	2026-11-04 14:26:35.769607+00
2286	164	164	2024-08-16	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2287	165	165	2024-08-16	present	Present	1	2026-11-04 14:26:35.769607+00
2288	166	166	2024-08-16	present	Present	1	2026-11-04 14:26:35.769607+00
2289	142	142	2024-08-16	present	Present	1	2026-11-04 14:26:35.769607+00
2290	143	143	2024-08-16	present	Present	1	2026-11-04 14:26:35.769607+00
2291	144	144	2024-08-16	present	Present	1	2026-11-04 14:26:35.769607+00
2292	145	145	2024-08-16	present	Present	1	2026-11-04 14:26:35.769607+00
2293	146	146	2024-08-16	present	Present	1	2026-11-04 14:26:35.769607+00
2294	147	147	2024-08-16	present	Present	1	2026-11-04 14:26:35.769607+00
2295	148	148	2024-08-16	present	Present	1	2026-11-04 14:26:35.769607+00
2296	149	149	2024-08-16	present	Present	1	2026-11-04 14:26:35.769607+00
2297	150	150	2024-08-16	present	Present	1	2026-11-04 14:26:35.769607+00
2298	151	151	2024-08-16	present	Present	1	2026-11-04 14:26:35.769607+00
2299	152	152	2024-08-16	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2300	153	153	2024-08-16	present	Present	1	2026-11-04 14:26:35.769607+00
2301	154	154	2024-08-16	present	Present	1	2026-11-04 14:26:35.769607+00
2302	156	156	2024-08-17	present	Present	1	2026-11-04 14:26:35.769607+00
2303	163	163	2024-08-17	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2304	167	167	2024-08-17	present	Present	1	2026-11-04 14:26:35.769607+00
2305	155	155	2024-08-17	present	Present	1	2026-11-04 14:26:35.769607+00
2306	129	129	2024-08-17	present	Present	1	2026-11-04 14:26:35.769607+00
2307	130	130	2024-08-17	present	Present	1	2026-11-04 14:26:35.769607+00
2308	131	131	2024-08-17	present	Present	1	2026-11-04 14:26:35.769607+00
2309	132	132	2024-08-17	present	Present	1	2026-11-04 14:26:35.769607+00
2310	133	133	2024-08-17	present	Present	1	2026-11-04 14:26:35.769607+00
2311	134	134	2024-08-17	late	Late by 10 mins	1	2026-11-04 14:26:35.769607+00
2312	135	135	2024-08-17	present	Present	1	2026-11-04 14:26:35.769607+00
2313	136	136	2024-08-17	present	Present	1	2026-11-04 14:26:35.769607+00
2314	138	138	2024-08-17	present	Present	1	2026-11-04 14:26:35.769607+00
2315	139	139	2024-08-17	present	Present	1	2026-11-04 14:26:35.769607+00
2316	140	140	2024-08-17	present	Present	1	2026-11-04 14:26:35.769607+00
2317	141	141	2024-08-17	present	Present	1	2026-11-04 14:26:35.769607+00
2318	137	137	2024-08-17	present	Present	1	2026-11-04 14:26:35.769607+00
2319	157	157	2024-08-17	present	Present	1	2026-11-04 14:26:35.769607+00
2320	158	158	2024-08-17	present	Present	1	2026-11-04 14:26:35.769607+00
2321	159	159	2024-08-17	present	Present	1	2026-11-04 14:26:35.769607+00
2322	160	160	2024-08-17	present	Present	1	2026-11-04 14:26:35.769607+00
2323	161	161	2024-08-17	present	Present	1	2026-11-04 14:26:35.769607+00
2324	162	162	2024-08-17	present	Present	1	2026-11-04 14:26:35.769607+00
2325	164	164	2024-08-17	present	Present	1	2026-11-04 14:26:35.769607+00
2326	165	165	2024-08-17	present	Present	1	2026-11-04 14:26:35.769607+00
2327	166	166	2024-08-17	present	Present	1	2026-11-04 14:26:35.769607+00
2328	142	142	2024-08-17	present	Present	1	2026-11-04 14:26:35.769607+00
2329	143	143	2024-08-17	present	Present	1	2026-11-04 14:26:35.769607+00
2330	144	144	2024-08-17	present	Present	1	2026-11-04 14:26:35.769607+00
2331	145	145	2024-08-17	present	Present	1	2026-11-04 14:26:35.769607+00
2332	146	146	2024-08-17	present	Present	1	2026-11-04 14:26:35.769607+00
2333	147	147	2024-08-17	present	Present	1	2026-11-04 14:26:35.769607+00
2334	148	148	2024-08-17	present	Present	1	2026-11-04 14:26:35.769607+00
2335	149	149	2024-08-17	present	Present	1	2026-11-04 14:26:35.769607+00
2336	150	150	2024-08-17	present	Present	1	2026-11-04 14:26:35.769607+00
2337	151	151	2024-08-17	present	Present	1	2026-11-04 14:26:35.769607+00
2338	152	152	2024-08-17	present	Present	1	2026-11-04 14:26:35.769607+00
2339	153	153	2024-08-17	present	Present	1	2026-11-04 14:26:35.769607+00
2340	154	154	2024-08-17	present	Present	1	2026-11-04 14:26:35.769607+00
2341	156	156	2024-08-19	late	Late by 10 mins	1	2026-11-04 14:26:35.769607+00
2342	163	163	2024-08-19	present	Present	1	2026-11-04 14:26:35.769607+00
2343	167	167	2024-08-19	present	Present	1	2026-11-04 14:26:35.769607+00
2344	155	155	2024-08-19	present	Present	1	2026-11-04 14:26:35.769607+00
2345	129	129	2024-08-19	present	Present	1	2026-11-04 14:26:35.769607+00
2346	130	130	2024-08-19	present	Present	1	2026-11-04 14:26:35.769607+00
2347	131	131	2024-08-19	present	Present	1	2026-11-04 14:26:35.769607+00
2348	132	132	2024-08-19	present	Present	1	2026-11-04 14:26:35.769607+00
2349	133	133	2024-08-19	present	Present	1	2026-11-04 14:26:35.769607+00
2350	134	134	2024-08-19	present	Present	1	2026-11-04 14:26:35.769607+00
2351	135	135	2024-08-19	present	Present	1	2026-11-04 14:26:35.769607+00
2352	136	136	2024-08-19	present	Present	1	2026-11-04 14:26:35.769607+00
2353	138	138	2024-08-19	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2354	139	139	2024-08-19	present	Present	1	2026-11-04 14:26:35.769607+00
2355	140	140	2024-08-19	present	Present	1	2026-11-04 14:26:35.769607+00
2356	141	141	2024-08-19	present	Present	1	2026-11-04 14:26:35.769607+00
2357	137	137	2024-08-19	present	Present	1	2026-11-04 14:26:35.769607+00
2358	157	157	2024-08-19	present	Present	1	2026-11-04 14:26:35.769607+00
2359	158	158	2024-08-19	present	Present	1	2026-11-04 14:26:35.769607+00
2360	159	159	2024-08-19	present	Present	1	2026-11-04 14:26:35.769607+00
2361	160	160	2024-08-19	present	Present	1	2026-11-04 14:26:35.769607+00
2362	161	161	2024-08-19	present	Present	1	2026-11-04 14:26:35.769607+00
2363	162	162	2024-08-19	present	Present	1	2026-11-04 14:26:35.769607+00
2364	164	164	2024-08-19	present	Present	1	2026-11-04 14:26:35.769607+00
2365	165	165	2024-08-19	present	Present	1	2026-11-04 14:26:35.769607+00
2366	166	166	2024-08-19	present	Present	1	2026-11-04 14:26:35.769607+00
2367	142	142	2024-08-19	present	Present	1	2026-11-04 14:26:35.769607+00
2368	143	143	2024-08-19	present	Present	1	2026-11-04 14:26:35.769607+00
2369	144	144	2024-08-19	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2370	145	145	2024-08-19	present	Present	1	2026-11-04 14:26:35.769607+00
2371	146	146	2024-08-19	present	Present	1	2026-11-04 14:26:35.769607+00
2372	147	147	2024-08-19	present	Present	1	2026-11-04 14:26:35.769607+00
2373	148	148	2024-08-19	present	Present	1	2026-11-04 14:26:35.769607+00
2374	149	149	2024-08-19	present	Present	1	2026-11-04 14:26:35.769607+00
2375	150	150	2024-08-19	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2376	151	151	2024-08-19	present	Present	1	2026-11-04 14:26:35.769607+00
2377	152	152	2024-08-19	present	Present	1	2026-11-04 14:26:35.769607+00
2378	153	153	2024-08-19	present	Present	1	2026-11-04 14:26:35.769607+00
2379	154	154	2024-08-19	present	Present	1	2026-11-04 14:26:35.769607+00
2380	156	156	2024-08-21	present	Present	1	2026-11-04 14:26:35.769607+00
2381	163	163	2024-08-21	present	Present	1	2026-11-04 14:26:35.769607+00
2382	167	167	2024-08-21	present	Present	1	2026-11-04 14:26:35.769607+00
2383	155	155	2024-08-21	present	Present	1	2026-11-04 14:26:35.769607+00
2384	129	129	2024-08-21	present	Present	1	2026-11-04 14:26:35.769607+00
2385	130	130	2024-08-21	present	Present	1	2026-11-04 14:26:35.769607+00
2386	131	131	2024-08-21	present	Present	1	2026-11-04 14:26:35.769607+00
2387	132	132	2024-08-21	present	Present	1	2026-11-04 14:26:35.769607+00
2388	133	133	2024-08-21	present	Present	1	2026-11-04 14:26:35.769607+00
2389	134	134	2024-08-21	present	Present	1	2026-11-04 14:26:35.769607+00
2390	135	135	2024-08-21	present	Present	1	2026-11-04 14:26:35.769607+00
2391	136	136	2024-08-21	present	Present	1	2026-11-04 14:26:35.769607+00
2392	138	138	2024-08-21	present	Present	1	2026-11-04 14:26:35.769607+00
2393	139	139	2024-08-21	present	Present	1	2026-11-04 14:26:35.769607+00
2394	140	140	2024-08-21	present	Present	1	2026-11-04 14:26:35.769607+00
2395	141	141	2024-08-21	present	Present	1	2026-11-04 14:26:35.769607+00
2396	137	137	2024-08-21	present	Present	1	2026-11-04 14:26:35.769607+00
2397	157	157	2024-08-21	present	Present	1	2026-11-04 14:26:35.769607+00
2398	158	158	2024-08-21	present	Present	1	2026-11-04 14:26:35.769607+00
2399	159	159	2024-08-21	present	Present	1	2026-11-04 14:26:35.769607+00
2400	160	160	2024-08-21	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2401	161	161	2024-08-21	present	Present	1	2026-11-04 14:26:35.769607+00
2402	162	162	2024-08-21	present	Present	1	2026-11-04 14:26:35.769607+00
2403	164	164	2024-08-21	present	Present	1	2026-11-04 14:26:35.769607+00
2404	165	165	2024-08-21	present	Present	1	2026-11-04 14:26:35.769607+00
2405	166	166	2024-08-21	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2406	142	142	2024-08-21	present	Present	1	2026-11-04 14:26:35.769607+00
2407	143	143	2024-08-21	present	Present	1	2026-11-04 14:26:35.769607+00
2408	144	144	2024-08-21	present	Present	1	2026-11-04 14:26:35.769607+00
2409	145	145	2024-08-21	present	Present	1	2026-11-04 14:26:35.769607+00
2410	146	146	2024-08-21	present	Present	1	2026-11-04 14:26:35.769607+00
2411	147	147	2024-08-21	present	Present	1	2026-11-04 14:26:35.769607+00
2412	148	148	2024-08-21	present	Present	1	2026-11-04 14:26:35.769607+00
2413	149	149	2024-08-21	present	Present	1	2026-11-04 14:26:35.769607+00
2414	150	150	2024-08-21	present	Present	1	2026-11-04 14:26:35.769607+00
2415	151	151	2024-08-21	present	Present	1	2026-11-04 14:26:35.769607+00
2416	152	152	2024-08-21	present	Present	1	2026-11-04 14:26:35.769607+00
2417	153	153	2024-08-21	present	Present	1	2026-11-04 14:26:35.769607+00
2418	154	154	2024-08-21	present	Present	1	2026-11-04 14:26:35.769607+00
2419	156	156	2024-08-23	present	Present	1	2026-11-04 14:26:35.769607+00
2420	163	163	2024-08-23	present	Present	1	2026-11-04 14:26:35.769607+00
2421	167	167	2024-08-23	present	Present	1	2026-11-04 14:26:35.769607+00
2422	155	155	2024-08-23	present	Present	1	2026-11-04 14:26:35.769607+00
2423	129	129	2024-08-23	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2424	130	130	2024-08-23	present	Present	1	2026-11-04 14:26:35.769607+00
2425	131	131	2024-08-23	present	Present	1	2026-11-04 14:26:35.769607+00
2426	132	132	2024-08-23	present	Present	1	2026-11-04 14:26:35.769607+00
2427	133	133	2024-08-23	present	Present	1	2026-11-04 14:26:35.769607+00
2428	134	134	2024-08-23	present	Present	1	2026-11-04 14:26:35.769607+00
2429	135	135	2024-08-23	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2430	136	136	2024-08-23	present	Present	1	2026-11-04 14:26:35.769607+00
2431	138	138	2024-08-23	present	Present	1	2026-11-04 14:26:35.769607+00
2432	139	139	2024-08-23	present	Present	1	2026-11-04 14:26:35.769607+00
2433	140	140	2024-08-23	present	Present	1	2026-11-04 14:26:35.769607+00
2434	141	141	2024-08-23	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2435	137	137	2024-08-23	present	Present	1	2026-11-04 14:26:35.769607+00
2436	157	157	2024-08-23	present	Present	1	2026-11-04 14:26:35.769607+00
2437	158	158	2024-08-23	present	Present	1	2026-11-04 14:26:35.769607+00
2438	159	159	2024-08-23	present	Present	1	2026-11-04 14:26:35.769607+00
2439	160	160	2024-08-23	present	Present	1	2026-11-04 14:26:35.769607+00
2440	161	161	2024-08-23	present	Present	1	2026-11-04 14:26:35.769607+00
2441	162	162	2024-08-23	present	Present	1	2026-11-04 14:26:35.769607+00
2442	164	164	2024-08-23	present	Present	1	2026-11-04 14:26:35.769607+00
2443	165	165	2024-08-23	present	Present	1	2026-11-04 14:26:35.769607+00
2444	166	166	2024-08-23	present	Present	1	2026-11-04 14:26:35.769607+00
2445	142	142	2024-08-23	present	Present	1	2026-11-04 14:26:35.769607+00
2446	143	143	2024-08-23	present	Present	1	2026-11-04 14:26:35.769607+00
2447	144	144	2024-08-23	present	Present	1	2026-11-04 14:26:35.769607+00
2448	145	145	2024-08-23	present	Present	1	2026-11-04 14:26:35.769607+00
2449	146	146	2024-08-23	present	Present	1	2026-11-04 14:26:35.769607+00
2450	147	147	2024-08-23	late	Late by 10 mins	1	2026-11-04 14:26:35.769607+00
2451	148	148	2024-08-23	present	Present	1	2026-11-04 14:26:35.769607+00
2452	149	149	2024-08-23	present	Present	1	2026-11-04 14:26:35.769607+00
2453	150	150	2024-08-23	present	Present	1	2026-11-04 14:26:35.769607+00
2454	151	151	2024-08-23	present	Present	1	2026-11-04 14:26:35.769607+00
2455	152	152	2024-08-23	present	Present	1	2026-11-04 14:26:35.769607+00
2456	153	153	2024-08-23	present	Present	1	2026-11-04 14:26:35.769607+00
2457	154	154	2024-08-23	present	Present	1	2026-11-04 14:26:35.769607+00
2458	156	156	2024-08-24	present	Present	1	2026-11-04 14:26:35.769607+00
2459	163	163	2024-08-24	present	Present	1	2026-11-04 14:26:35.769607+00
2460	167	167	2024-08-24	present	Present	1	2026-11-04 14:26:35.769607+00
2461	155	155	2024-08-24	present	Present	1	2026-11-04 14:26:35.769607+00
2462	129	129	2024-08-24	present	Present	1	2026-11-04 14:26:35.769607+00
2463	130	130	2024-08-24	present	Present	1	2026-11-04 14:26:35.769607+00
2464	131	131	2024-08-24	present	Present	1	2026-11-04 14:26:35.769607+00
2465	132	132	2024-08-24	present	Present	1	2026-11-04 14:26:35.769607+00
2466	133	133	2024-08-24	present	Present	1	2026-11-04 14:26:35.769607+00
2467	134	134	2024-08-24	present	Present	1	2026-11-04 14:26:35.769607+00
2468	135	135	2024-08-24	present	Present	1	2026-11-04 14:26:35.769607+00
2469	136	136	2024-08-24	present	Present	1	2026-11-04 14:26:35.769607+00
2470	138	138	2024-08-24	present	Present	1	2026-11-04 14:26:35.769607+00
2471	139	139	2024-08-24	present	Present	1	2026-11-04 14:26:35.769607+00
2472	140	140	2024-08-24	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2473	141	141	2024-08-24	present	Present	1	2026-11-04 14:26:35.769607+00
2474	137	137	2024-08-24	present	Present	1	2026-11-04 14:26:35.769607+00
2475	157	157	2024-08-24	present	Present	1	2026-11-04 14:26:35.769607+00
2476	158	158	2024-08-24	late	Late by 10 mins	1	2026-11-04 14:26:35.769607+00
2477	159	159	2024-08-24	present	Present	1	2026-11-04 14:26:35.769607+00
2478	160	160	2024-08-24	present	Present	1	2026-11-04 14:26:35.769607+00
2479	161	161	2024-08-24	present	Present	1	2026-11-04 14:26:35.769607+00
2480	162	162	2024-08-24	present	Present	1	2026-11-04 14:26:35.769607+00
2481	164	164	2024-08-24	present	Present	1	2026-11-04 14:26:35.769607+00
2482	165	165	2024-08-24	present	Present	1	2026-11-04 14:26:35.769607+00
2483	166	166	2024-08-24	present	Present	1	2026-11-04 14:26:35.769607+00
2484	142	142	2024-08-24	present	Present	1	2026-11-04 14:26:35.769607+00
2485	143	143	2024-08-24	present	Present	1	2026-11-04 14:26:35.769607+00
2486	144	144	2024-08-24	present	Present	1	2026-11-04 14:26:35.769607+00
2487	145	145	2024-08-24	present	Present	1	2026-11-04 14:26:35.769607+00
2488	146	146	2024-08-24	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2489	147	147	2024-08-24	present	Present	1	2026-11-04 14:26:35.769607+00
2490	148	148	2024-08-24	present	Present	1	2026-11-04 14:26:35.769607+00
2491	149	149	2024-08-24	present	Present	1	2026-11-04 14:26:35.769607+00
2492	150	150	2024-08-24	present	Present	1	2026-11-04 14:26:35.769607+00
2493	151	151	2024-08-24	present	Present	1	2026-11-04 14:26:35.769607+00
2494	152	152	2024-08-24	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2495	153	153	2024-08-24	present	Present	1	2026-11-04 14:26:35.769607+00
2496	154	154	2024-08-24	present	Present	1	2026-11-04 14:26:35.769607+00
2497	156	156	2024-08-26	present	Present	1	2026-11-04 14:26:35.769607+00
2498	163	163	2024-08-26	present	Present	1	2026-11-04 14:26:35.769607+00
2499	167	167	2024-08-26	present	Present	1	2026-11-04 14:26:35.769607+00
2500	155	155	2024-08-26	present	Present	1	2026-11-04 14:26:35.769607+00
2501	129	129	2024-08-26	present	Present	1	2026-11-04 14:26:35.769607+00
2502	130	130	2024-08-26	present	Present	1	2026-11-04 14:26:35.769607+00
2503	131	131	2024-08-26	present	Present	1	2026-11-04 14:26:35.769607+00
2504	132	132	2024-08-26	present	Present	1	2026-11-04 14:26:35.769607+00
2505	133	133	2024-08-26	late	Late by 10 mins	1	2026-11-04 14:26:35.769607+00
2506	134	134	2024-08-26	present	Present	1	2026-11-04 14:26:35.769607+00
2507	135	135	2024-08-26	present	Present	1	2026-11-04 14:26:35.769607+00
2508	136	136	2024-08-26	present	Present	1	2026-11-04 14:26:35.769607+00
2509	138	138	2024-08-26	present	Present	1	2026-11-04 14:26:35.769607+00
2510	139	139	2024-08-26	present	Present	1	2026-11-04 14:26:35.769607+00
2511	140	140	2024-08-26	present	Present	1	2026-11-04 14:26:35.769607+00
2512	141	141	2024-08-26	present	Present	1	2026-11-04 14:26:35.769607+00
2513	137	137	2024-08-26	present	Present	1	2026-11-04 14:26:35.769607+00
2514	157	157	2024-08-26	present	Present	1	2026-11-04 14:26:35.769607+00
2515	158	158	2024-08-26	present	Present	1	2026-11-04 14:26:35.769607+00
2516	159	159	2024-08-26	present	Present	1	2026-11-04 14:26:35.769607+00
2517	160	160	2024-08-26	present	Present	1	2026-11-04 14:26:35.769607+00
2518	161	161	2024-08-26	present	Present	1	2026-11-04 14:26:35.769607+00
2519	162	162	2024-08-26	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2520	164	164	2024-08-26	present	Present	1	2026-11-04 14:26:35.769607+00
2521	165	165	2024-08-26	present	Present	1	2026-11-04 14:26:35.769607+00
2522	166	166	2024-08-26	present	Present	1	2026-11-04 14:26:35.769607+00
2523	142	142	2024-08-26	present	Present	1	2026-11-04 14:26:35.769607+00
2524	143	143	2024-08-26	present	Present	1	2026-11-04 14:26:35.769607+00
2525	144	144	2024-08-26	present	Present	1	2026-11-04 14:26:35.769607+00
2526	145	145	2024-08-26	present	Present	1	2026-11-04 14:26:35.769607+00
2527	146	146	2024-08-26	present	Present	1	2026-11-04 14:26:35.769607+00
2528	147	147	2024-08-26	present	Present	1	2026-11-04 14:26:35.769607+00
2529	148	148	2024-08-26	present	Present	1	2026-11-04 14:26:35.769607+00
2530	149	149	2024-08-26	present	Present	1	2026-11-04 14:26:35.769607+00
2531	150	150	2024-08-26	present	Present	1	2026-11-04 14:26:35.769607+00
2532	151	151	2024-08-26	present	Present	1	2026-11-04 14:26:35.769607+00
2533	152	152	2024-08-26	present	Present	1	2026-11-04 14:26:35.769607+00
2534	153	153	2024-08-26	present	Present	1	2026-11-04 14:26:35.769607+00
2535	154	154	2024-08-26	present	Present	1	2026-11-04 14:26:35.769607+00
2536	156	156	2024-08-28	present	Present	1	2026-11-04 14:26:35.769607+00
2537	163	163	2024-08-28	present	Present	1	2026-11-04 14:26:35.769607+00
2538	167	167	2024-08-28	present	Present	1	2026-11-04 14:26:35.769607+00
2539	155	155	2024-08-28	late	Late by 10 mins	1	2026-11-04 14:26:35.769607+00
2540	129	129	2024-08-28	present	Present	1	2026-11-04 14:26:35.769607+00
2541	130	130	2024-08-28	present	Present	1	2026-11-04 14:26:35.769607+00
2542	131	131	2024-08-28	present	Present	1	2026-11-04 14:26:35.769607+00
2543	132	132	2024-08-28	present	Present	1	2026-11-04 14:26:35.769607+00
2544	133	133	2024-08-28	present	Present	1	2026-11-04 14:26:35.769607+00
2545	134	134	2024-08-28	present	Present	1	2026-11-04 14:26:35.769607+00
2546	135	135	2024-08-28	present	Present	1	2026-11-04 14:26:35.769607+00
2547	136	136	2024-08-28	present	Present	1	2026-11-04 14:26:35.769607+00
2548	138	138	2024-08-28	present	Present	1	2026-11-04 14:26:35.769607+00
2549	139	139	2024-08-28	present	Present	1	2026-11-04 14:26:35.769607+00
2550	140	140	2024-08-28	present	Present	1	2026-11-04 14:26:35.769607+00
2551	141	141	2024-08-28	present	Present	1	2026-11-04 14:26:35.769607+00
2552	137	137	2024-08-28	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2553	157	157	2024-08-28	present	Present	1	2026-11-04 14:26:35.769607+00
2554	158	158	2024-08-28	present	Present	1	2026-11-04 14:26:35.769607+00
2555	159	159	2024-08-28	present	Present	1	2026-11-04 14:26:35.769607+00
2556	160	160	2024-08-28	present	Present	1	2026-11-04 14:26:35.769607+00
2557	161	161	2024-08-28	present	Present	1	2026-11-04 14:26:35.769607+00
2558	162	162	2024-08-28	present	Present	1	2026-11-04 14:26:35.769607+00
2559	164	164	2024-08-28	present	Present	1	2026-11-04 14:26:35.769607+00
2560	165	165	2024-08-28	present	Present	1	2026-11-04 14:26:35.769607+00
2561	166	166	2024-08-28	present	Present	1	2026-11-04 14:26:35.769607+00
2562	142	142	2024-08-28	present	Present	1	2026-11-04 14:26:35.769607+00
2563	143	143	2024-08-28	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2564	144	144	2024-08-28	present	Present	1	2026-11-04 14:26:35.769607+00
2565	145	145	2024-08-28	present	Present	1	2026-11-04 14:26:35.769607+00
2566	146	146	2024-08-28	present	Present	1	2026-11-04 14:26:35.769607+00
2567	147	147	2024-08-28	present	Present	1	2026-11-04 14:26:35.769607+00
2568	148	148	2024-08-28	present	Present	1	2026-11-04 14:26:35.769607+00
2569	149	149	2024-08-28	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2570	150	150	2024-08-28	present	Present	1	2026-11-04 14:26:35.769607+00
2571	151	151	2024-08-28	present	Present	1	2026-11-04 14:26:35.769607+00
2572	152	152	2024-08-28	present	Present	1	2026-11-04 14:26:35.769607+00
2573	153	153	2024-08-28	present	Present	1	2026-11-04 14:26:35.769607+00
2574	154	154	2024-08-28	present	Present	1	2026-11-04 14:26:35.769607+00
2575	156	156	2024-08-30	present	Present	1	2026-11-04 14:26:35.769607+00
2576	163	163	2024-08-30	present	Present	1	2026-11-04 14:26:35.769607+00
2577	167	167	2024-08-30	present	Present	1	2026-11-04 14:26:35.769607+00
2578	155	155	2024-08-30	present	Present	1	2026-11-04 14:26:35.769607+00
2579	129	129	2024-08-30	present	Present	1	2026-11-04 14:26:35.769607+00
2580	130	130	2024-08-30	present	Present	1	2026-11-04 14:26:35.769607+00
2581	131	131	2024-08-30	present	Present	1	2026-11-04 14:26:35.769607+00
2582	132	132	2024-08-30	present	Present	1	2026-11-04 14:26:35.769607+00
2583	133	133	2024-08-30	present	Present	1	2026-11-04 14:26:35.769607+00
2584	134	134	2024-08-30	present	Present	1	2026-11-04 14:26:35.769607+00
2585	135	135	2024-08-30	present	Present	1	2026-11-04 14:26:35.769607+00
2586	136	136	2024-08-30	present	Present	1	2026-11-04 14:26:35.769607+00
2587	138	138	2024-08-30	present	Present	1	2026-11-04 14:26:35.769607+00
2588	139	139	2024-08-30	present	Present	1	2026-11-04 14:26:35.769607+00
2589	140	140	2024-08-30	present	Present	1	2026-11-04 14:26:35.769607+00
2590	141	141	2024-08-30	present	Present	1	2026-11-04 14:26:35.769607+00
2591	137	137	2024-08-30	present	Present	1	2026-11-04 14:26:35.769607+00
2592	157	157	2024-08-30	present	Present	1	2026-11-04 14:26:35.769607+00
2593	158	158	2024-08-30	present	Present	1	2026-11-04 14:26:35.769607+00
2594	159	159	2024-08-30	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2595	160	160	2024-08-30	present	Present	1	2026-11-04 14:26:35.769607+00
2596	161	161	2024-08-30	present	Present	1	2026-11-04 14:26:35.769607+00
2597	162	162	2024-08-30	present	Present	1	2026-11-04 14:26:35.769607+00
2598	164	164	2024-08-30	present	Present	1	2026-11-04 14:26:35.769607+00
2599	165	165	2024-08-30	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2600	166	166	2024-08-30	present	Present	1	2026-11-04 14:26:35.769607+00
2601	142	142	2024-08-30	present	Present	1	2026-11-04 14:26:35.769607+00
2602	143	143	2024-08-30	present	Present	1	2026-11-04 14:26:35.769607+00
2603	144	144	2024-08-30	present	Present	1	2026-11-04 14:26:35.769607+00
2604	145	145	2024-08-30	present	Present	1	2026-11-04 14:26:35.769607+00
2605	146	146	2024-08-30	present	Present	1	2026-11-04 14:26:35.769607+00
2606	147	147	2024-08-30	present	Present	1	2026-11-04 14:26:35.769607+00
2607	148	148	2024-08-30	present	Present	1	2026-11-04 14:26:35.769607+00
2608	149	149	2024-08-30	present	Present	1	2026-11-04 14:26:35.769607+00
2609	150	150	2024-08-30	present	Present	1	2026-11-04 14:26:35.769607+00
2610	151	151	2024-08-30	present	Present	1	2026-11-04 14:26:35.769607+00
2611	152	152	2024-08-30	present	Present	1	2026-11-04 14:26:35.769607+00
2612	153	153	2024-08-30	present	Present	1	2026-11-04 14:26:35.769607+00
2613	154	154	2024-08-30	present	Present	1	2026-11-04 14:26:35.769607+00
2614	156	156	2024-08-31	present	Present	1	2026-11-04 14:26:35.769607+00
2615	163	163	2024-08-31	present	Present	1	2026-11-04 14:26:35.769607+00
2616	167	167	2024-08-31	present	Present	1	2026-11-04 14:26:35.769607+00
2617	155	155	2024-08-31	present	Present	1	2026-11-04 14:26:35.769607+00
2618	129	129	2024-08-31	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2619	130	130	2024-08-31	present	Present	1	2026-11-04 14:26:35.769607+00
2620	131	131	2024-08-31	present	Present	1	2026-11-04 14:26:35.769607+00
2621	132	132	2024-08-31	present	Present	1	2026-11-04 14:26:35.769607+00
2622	133	133	2024-08-31	present	Present	1	2026-11-04 14:26:35.769607+00
2623	134	134	2024-08-31	present	Present	1	2026-11-04 14:26:35.769607+00
2624	135	135	2024-08-31	late	Late by 10 mins	1	2026-11-04 14:26:35.769607+00
2625	136	136	2024-08-31	present	Present	1	2026-11-04 14:26:35.769607+00
2626	138	138	2024-08-31	present	Present	1	2026-11-04 14:26:35.769607+00
2627	139	139	2024-08-31	present	Present	1	2026-11-04 14:26:35.769607+00
2628	140	140	2024-08-31	present	Present	1	2026-11-04 14:26:35.769607+00
2629	141	141	2024-08-31	present	Present	1	2026-11-04 14:26:35.769607+00
2630	137	137	2024-08-31	present	Present	1	2026-11-04 14:26:35.769607+00
2631	157	157	2024-08-31	present	Present	1	2026-11-04 14:26:35.769607+00
2632	158	158	2024-08-31	present	Present	1	2026-11-04 14:26:35.769607+00
2633	159	159	2024-08-31	present	Present	1	2026-11-04 14:26:35.769607+00
2634	160	160	2024-08-31	present	Present	1	2026-11-04 14:26:35.769607+00
2635	161	161	2024-08-31	present	Present	1	2026-11-04 14:26:35.769607+00
2636	162	162	2024-08-31	present	Present	1	2026-11-04 14:26:35.769607+00
2637	164	164	2024-08-31	present	Present	1	2026-11-04 14:26:35.769607+00
2638	165	165	2024-08-31	present	Present	1	2026-11-04 14:26:35.769607+00
2639	166	166	2024-08-31	present	Present	1	2026-11-04 14:26:35.769607+00
2640	142	142	2024-08-31	present	Present	1	2026-11-04 14:26:35.769607+00
2641	143	143	2024-08-31	present	Present	1	2026-11-04 14:26:35.769607+00
2642	144	144	2024-08-31	present	Present	1	2026-11-04 14:26:35.769607+00
2643	145	145	2024-08-31	present	Present	1	2026-11-04 14:26:35.769607+00
2644	146	146	2024-08-31	present	Present	1	2026-11-04 14:26:35.769607+00
2645	147	147	2024-08-31	present	Present	1	2026-11-04 14:26:35.769607+00
2646	148	148	2024-08-31	present	Present	1	2026-11-04 14:26:35.769607+00
2647	149	149	2024-08-31	present	Present	1	2026-11-04 14:26:35.769607+00
2648	150	150	2024-08-31	present	Present	1	2026-11-04 14:26:35.769607+00
2649	151	151	2024-08-31	present	Present	1	2026-11-04 14:26:35.769607+00
2650	152	152	2024-08-31	present	Present	1	2026-11-04 14:26:35.769607+00
2651	153	153	2024-08-31	present	Present	1	2026-11-04 14:26:35.769607+00
2652	154	154	2024-08-31	present	Present	1	2026-11-04 14:26:35.769607+00
2653	156	156	2024-09-02	present	Present	1	2026-11-04 14:26:35.769607+00
2654	163	163	2024-09-02	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2655	167	167	2024-09-02	present	Present	1	2026-11-04 14:26:35.769607+00
2656	155	155	2024-09-02	present	Present	1	2026-11-04 14:26:35.769607+00
2657	129	129	2024-09-02	present	Present	1	2026-11-04 14:26:35.769607+00
2658	130	130	2024-09-02	present	Present	1	2026-11-04 14:26:35.769607+00
2659	131	131	2024-09-02	present	Present	1	2026-11-04 14:26:35.769607+00
2660	132	132	2024-09-02	present	Present	1	2026-11-04 14:26:35.769607+00
2661	133	133	2024-09-02	present	Present	1	2026-11-04 14:26:35.769607+00
2662	134	134	2024-09-02	present	Present	1	2026-11-04 14:26:35.769607+00
2663	135	135	2024-09-02	present	Present	1	2026-11-04 14:26:35.769607+00
2664	136	136	2024-09-02	present	Present	1	2026-11-04 14:26:35.769607+00
2665	138	138	2024-09-02	present	Present	1	2026-11-04 14:26:35.769607+00
2666	139	139	2024-09-02	present	Present	1	2026-11-04 14:26:35.769607+00
2667	140	140	2024-09-02	present	Present	1	2026-11-04 14:26:35.769607+00
2668	141	141	2024-09-02	present	Present	1	2026-11-04 14:26:35.769607+00
2669	137	137	2024-09-02	present	Present	1	2026-11-04 14:26:35.769607+00
2670	157	157	2024-09-02	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2671	158	158	2024-09-02	present	Present	1	2026-11-04 14:26:35.769607+00
2672	159	159	2024-09-02	present	Present	1	2026-11-04 14:26:35.769607+00
2673	160	160	2024-09-02	present	Present	1	2026-11-04 14:26:35.769607+00
2674	161	161	2024-09-02	present	Present	1	2026-11-04 14:26:35.769607+00
2675	162	162	2024-09-02	present	Present	1	2026-11-04 14:26:35.769607+00
2676	164	164	2024-09-02	present	Present	1	2026-11-04 14:26:35.769607+00
2677	165	165	2024-09-02	present	Present	1	2026-11-04 14:26:35.769607+00
2678	166	166	2024-09-02	present	Present	1	2026-11-04 14:26:35.769607+00
2679	142	142	2024-09-02	present	Present	1	2026-11-04 14:26:35.769607+00
2680	143	143	2024-09-02	present	Present	1	2026-11-04 14:26:35.769607+00
2681	144	144	2024-09-02	present	Present	1	2026-11-04 14:26:35.769607+00
2682	145	145	2024-09-02	present	Present	1	2026-11-04 14:26:35.769607+00
2683	146	146	2024-09-02	present	Present	1	2026-11-04 14:26:35.769607+00
2684	147	147	2024-09-02	present	Present	1	2026-11-04 14:26:35.769607+00
2685	148	148	2024-09-02	present	Present	1	2026-11-04 14:26:35.769607+00
2686	149	149	2024-09-02	present	Present	1	2026-11-04 14:26:35.769607+00
2687	150	150	2024-09-02	present	Present	1	2026-11-04 14:26:35.769607+00
2688	151	151	2024-09-02	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2689	152	152	2024-09-02	present	Present	1	2026-11-04 14:26:35.769607+00
2690	153	153	2024-09-02	present	Present	1	2026-11-04 14:26:35.769607+00
2691	154	154	2024-09-02	present	Present	1	2026-11-04 14:26:35.769607+00
2692	156	156	2024-09-04	present	Present	1	2026-11-04 14:26:35.769607+00
2693	163	163	2024-09-04	present	Present	1	2026-11-04 14:26:35.769607+00
2694	167	167	2024-09-04	present	Present	1	2026-11-04 14:26:35.769607+00
2695	155	155	2024-09-04	present	Present	1	2026-11-04 14:26:35.769607+00
2696	129	129	2024-09-04	present	Present	1	2026-11-04 14:26:35.769607+00
2697	130	130	2024-09-04	present	Present	1	2026-11-04 14:26:35.769607+00
2698	131	131	2024-09-04	present	Present	1	2026-11-04 14:26:35.769607+00
2699	132	132	2024-09-04	absent	Parent notified - Medical	1	2026-11-04 14:26:35.769607+00
2700	133	133	2024-09-04	present	Present	1	2026-11-04 14:26:35.769607+00
2701	134	134	2024-09-04	present	Present	1	2026-11-04 14:26:35.769607+00
2702	135	135	2024-09-04	present	Present	1	2026-11-04 14:26:35.769607+00
2703	136	136	2024-09-04	present	Present	1	2026-11-04 14:26:35.769607+00
2704	138	138	2024-09-04	late	Late by 10 mins	1	2026-11-04 14:26:35.769607+00
2705	139	139	2024-09-04	present	Present	1	2026-11-04 14:26:35.769607+00
2706	140	140	2024-09-04	present	Present	1	2026-11-04 14:26:35.769607+00
2707	141	141	2024-09-04	present	Present	1	2026-11-04 14:26:35.769607+00
2708	137	137	2024-09-04	present	Present	1	2026-11-04 14:26:35.769607+00
2709	157	157	2024-09-04	present	Present	1	2026-11-04 14:26:35.769607+00
2710	158	158	2024-09-04	present	Present	1	2026-11-04 14:26:35.769607+00
2711	159	159	2024-09-04	present	Present	1	2026-11-04 14:26:35.769607+00
2712	160	160	2024-09-04	present	Present	1	2026-11-04 14:26:35.769607+00
2713	161	161	2024-09-04	present	Present	1	2026-11-04 14:26:35.769607+00
2714	162	162	2024-09-04	present	Present	1	2026-11-04 14:26:35.769607+00
2715	164	164	2024-09-04	present	Present	1	2026-11-04 14:26:35.769607+00
2716	165	165	2024-09-04	present	Present	1	2026-11-04 14:26:35.769607+00
2717	166	166	2024-09-04	present	Present	1	2026-11-04 14:26:35.769607+00
2718	142	142	2024-09-04	present	Present	1	2026-11-04 14:26:35.769607+00
2719	143	143	2024-09-04	present	Present	1	2026-11-04 14:26:35.769607+00
2720	144	144	2024-09-04	present	Present	1	2026-11-04 14:26:35.769607+00
2721	145	145	2024-09-04	present	Present	1	2026-11-04 14:26:35.769607+00
2722	146	146	2024-09-04	present	Present	1	2026-11-04 14:26:35.769607+00
2723	147	147	2024-09-04	present	Present	1	2026-11-04 14:26:35.769607+00
2724	148	148	2024-09-04	present	Present	1	2026-11-04 14:26:35.769607+00
2725	149	149	2024-09-04	present	Present	1	2026-11-04 14:26:35.769607+00
2726	150	150	2024-09-04	present	Present	1	2026-11-04 14:26:35.769607+00
2727	151	151	2024-09-04	present	Present	1	2026-11-04 14:26:35.769607+00
2728	152	152	2024-09-04	present	Present	1	2026-11-04 14:26:35.769607+00
2729	153	153	2024-09-04	present	Present	1	2026-11-04 14:26:35.769607+00
2730	154	154	2024-09-04	present	Present	1	2026-11-04 14:26:35.769607+00
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, user_id, action, resource_type, resource_id, old_data, new_data, ip_address, user_agent, created_at) FROM stdin;
1	1	batch_transfer	student_enrollment	137	division_id=26	division_id=30, reason=Performance stream promotion	\N	\N	2026-11-04 05:15:07.256394+00
2	1	batch_transfer	student_enrollment	168	division_id=30	division_id=26, reason=Performance stream promotion	\N	\N	2026-11-04 05:18:15.700842+00
5	1	batch_transfer	student_enrollment	170	division_id=26	division_id=1, reason=testing promotion	\N	\N	2026-11-04 06:26:28.428626+00
6	1	create	division	44	\N	Created batch 'Audit Batch Alpha' (AUD-13-A)	\N	\N	2026-11-04 06:30:10.035846+00
7	1	update	division	44	name=Audit Batch Alpha, code=AUD-13-A, capacity=2, status=active	{'schedule_timing': 'Mon - Fri, 08:30 AM - 10:30 AM'}	\N	\N	2026-11-04 06:30:10.098405+00
8	1	update	division	44	name=Audit Batch Alpha, code=AUD-13-A, capacity=2, status=active	{'room_number': 'Lab 4', 'schedule_timing': 'Mon - Fri, 09:00 AM - 11:00 AM', 'class_teacher_id': 121}	\N	\N	2026-11-04 06:30:10.168863+00
9	1	create	division	45	\N	Created batch 'Audit Batch Alpha' (AUD-13-A)	\N	\N	2026-11-04 06:30:50.583409+00
10	1	update	division	45	name=Audit Batch Alpha, code=AUD-13-A, capacity=2, status=active	{'schedule_timing': 'Mon - Fri, 08:30 AM - 10:30 AM'}	\N	\N	2026-11-04 06:30:50.614216+00
11	1	update	division	45	name=Audit Batch Alpha, code=AUD-13-A, capacity=2, status=active	{'room_number': 'Lab 4', 'schedule_timing': 'Mon - Fri, 09:00 AM - 11:00 AM', 'class_teacher_id': 121}	\N	\N	2026-11-04 06:30:50.656066+00
12	1	enrollment_created	student_enrollment	173	\N	Enrolled student #155 into division #45	\N	\N	2026-11-04 06:30:50.748497+00
13	1	enrollment_created	student_enrollment	174	\N	Enrolled student #167 into division #45	\N	\N	2026-11-04 06:30:50.785228+00
14	1	create	division	46	\N	Created batch 'Audit Batch Beta' (AUD-13-B)	\N	\N	2026-11-04 06:30:50.827639+00
15	1	batch_transfer	student_enrollment	173	division_id=45	division_id=46, reason=Performance stream reallocation	\N	\N	2026-11-04 06:30:50.851554+00
16	1	update	division	46	name=Audit Batch Beta, code=AUD-13-B, capacity=10, status=active	{'class_teacher_id': 121}	\N	\N	2026-11-04 06:30:51.078794+00
17	1	create	division	47	\N	Created batch 'Audit Batch Alpha' (AUD-13-A)	\N	\N	2026-11-04 06:31:36.927663+00
18	1	update	division	47	name=Audit Batch Alpha, code=AUD-13-A, capacity=2, status=active	{'schedule_timing': 'Mon - Fri, 08:30 AM - 10:30 AM'}	\N	\N	2026-11-04 06:31:36.965703+00
19	1	update	division	47	name=Audit Batch Alpha, code=AUD-13-A, capacity=2, status=active	{'room_number': 'Lab 4', 'schedule_timing': 'Mon - Fri, 09:00 AM - 11:00 AM', 'class_teacher_id': 121}	\N	\N	2026-11-04 06:31:36.999355+00
20	1	enrollment_created	student_enrollment	176	\N	Enrolled student #155 into division #47	\N	\N	2026-11-04 06:31:37.06795+00
21	1	enrollment_created	student_enrollment	177	\N	Enrolled student #167 into division #47	\N	\N	2026-11-04 06:31:37.098048+00
22	1	create	division	48	\N	Created batch 'Audit Batch Beta' (AUD-13-B)	\N	\N	2026-11-04 06:31:37.131666+00
23	1	batch_transfer	student_enrollment	176	division_id=47	division_id=48, reason=Performance stream reallocation	\N	\N	2026-11-04 06:31:37.150188+00
24	1	update	division	48	name=Audit Batch Beta, code=AUD-13-B, capacity=10, status=active	{'class_teacher_id': 121}	\N	\N	2026-11-04 06:31:37.219336+00
25	1	batch_transfer	student_enrollment	176	division_id=47	division_id=1, reason=Performance stream promotion	\N	\N	2026-11-04 06:32:31.015712+00
26	1	batch_transfer	student_enrollment	173	division_id=45	division_id=1, reason=Performance stream promotion	\N	\N	2026-11-04 06:33:09.083336+00
28	1	batch_transfer	student_enrollment	181	division_id=1	division_id=2, reason=Performance stream promotion	\N	\N	2026-11-04 06:34:11.834419+00
31	1	batch_transfer	student_enrollment	184	division_id=2	division_id=1, reason=Performance stream promotion	\N	\N	2026-11-04 07:13:22.717022+00
32	1	batch_transfer	student_enrollment	182	division_id=2	division_id=1, reason=Performance stream promotion	\N	\N	2026-11-04 07:33:58.545357+00
34	1	batch_transfer	student_enrollment	185	division_id=1	division_id=2, reason=Performance stream promotion	\N	\N	2026-11-04 07:56:59.893333+00
35	1	batch_transfer	student_enrollment	179	division_id=1	division_id=2, reason=Performance stream promotion	\N	\N	2026-11-04 08:24:51.314499+00
37	1	batch_transfer	student_enrollment	183	division_id=1	division_id=2, reason=Performance stream promotion	\N	\N	2026-11-04 08:41:45.603063+00
39	1	batch_transfer	student_enrollment	190	division_id=1	division_id=2, reason=Performance stream promotion	\N	\N	2026-11-04 09:12:55.496989+00
40	1	batch_transfer	student_enrollment	192	division_id=2	division_id=1, reason=Performance stream promotion	\N	\N	2026-11-04 09:27:25.701263+00
42	1	batch_transfer	student_enrollment	194	division_id=1	division_id=2, reason=Performance stream promotion	\N	\N	2026-11-04 10:06:32.829901+00
46	1	create	division	49	\N	Created batch 'Audit Batch Alpha' (AUD-13-A)	\N	\N	2026-11-04 11:47:38.948552+00
47	1	update	division	49	name=Audit Batch Alpha, code=AUD-13-A, capacity=2, status=active	{'schedule_timing': 'Mon - Fri, 08:30 AM - 10:30 AM'}	\N	\N	2026-11-04 11:47:39.033022+00
48	1	update	division	49	name=Audit Batch Alpha, code=AUD-13-A, capacity=2, status=active	{'room_number': 'Lab 4', 'schedule_timing': 'Mon - Fri, 09:00 AM - 11:00 AM', 'class_teacher_id': 121}	\N	\N	2026-11-04 11:47:39.128273+00
49	1	enrollment_created	student_enrollment	200	\N	Enrolled student #155 into division #49	\N	\N	2026-11-04 11:47:39.308761+00
50	1	enrollment_created	student_enrollment	201	\N	Enrolled student #167 into division #49	\N	\N	2026-11-04 11:47:39.528595+00
51	1	create	division	50	\N	Created batch 'Audit Batch Beta' (AUD-13-B)	\N	\N	2026-11-04 11:47:39.648371+00
52	1	batch_transfer	student_enrollment	200	division_id=49	division_id=50, reason=Performance stream reallocation	\N	\N	2026-11-04 11:47:39.716802+00
53	1	update	division	50	name=Audit Batch Beta, code=AUD-13-B, capacity=10, status=active	{'class_teacher_id': 121}	\N	\N	2026-11-04 11:47:39.984072+00
54	1	batch_transfer	student_enrollment	137	division_id=26	division_id=1, reason=Performance stream promotion	\N	\N	2026-11-04 11:51:22.641556+00
55	1	batch_transfer	student_enrollment	205	division_id=1	division_id=2, reason=Performance stream promotion	\N	\N	2026-11-04 12:30:43.744079+00
56	1	create	division	51	\N	Created batch 'Audit Batch Alpha' (AUD-13-A)	\N	\N	2026-11-04 12:31:40.701688+00
57	1	update	division	51	name=Audit Batch Alpha, code=AUD-13-A, capacity=2, status=active	{'schedule_timing': 'Mon - Fri, 08:30 AM - 10:30 AM'}	\N	\N	2026-11-04 12:31:40.770089+00
58	1	update	division	51	name=Audit Batch Alpha, code=AUD-13-A, capacity=2, status=active	{'room_number': 'Lab 4', 'schedule_timing': 'Mon - Fri, 09:00 AM - 11:00 AM', 'class_teacher_id': 121}	\N	\N	2026-11-04 12:31:40.873658+00
59	1	enrollment_created	student_enrollment	207	\N	Enrolled student #155 into division #51	\N	\N	2026-11-04 12:31:41.021755+00
60	1	enrollment_created	student_enrollment	208	\N	Enrolled student #167 into division #51	\N	\N	2026-11-04 12:31:41.157706+00
61	1	create	division	52	\N	Created batch 'Audit Batch Beta' (AUD-13-B)	\N	\N	2026-11-04 12:31:41.274058+00
62	1	batch_transfer	student_enrollment	207	division_id=51	division_id=52, reason=Performance stream reallocation	\N	\N	2026-11-04 12:31:41.346261+00
63	1	update	division	52	name=Audit Batch Beta, code=AUD-13-B, capacity=10, status=active	{'class_teacher_id': 121}	\N	\N	2026-11-04 12:31:41.60996+00
64	1	create	division	53	\N	Created batch 'Audit Batch Alpha' (AUD-13-A)	\N	\N	2026-11-04 12:34:52.493298+00
65	1	update	division	53	name=Audit Batch Alpha, code=AUD-13-A, capacity=2, status=active	{'schedule_timing': 'Mon - Fri, 08:30 AM - 10:30 AM'}	\N	\N	2026-11-04 12:34:52.556967+00
66	1	update	division	53	name=Audit Batch Alpha, code=AUD-13-A, capacity=2, status=active	{'room_number': 'Lab 4', 'schedule_timing': 'Mon - Fri, 09:00 AM - 11:00 AM', 'class_teacher_id': 121}	\N	\N	2026-11-04 12:34:52.64872+00
67	1	enrollment_created	student_enrollment	210	\N	Enrolled student #155 into division #53	\N	\N	2026-11-04 12:34:52.921155+00
68	1	enrollment_created	student_enrollment	211	\N	Enrolled student #167 into division #53	\N	\N	2026-11-04 12:34:53.057433+00
69	1	create	division	54	\N	Created batch 'Audit Batch Beta' (AUD-13-B)	\N	\N	2026-11-04 12:34:53.185503+00
70	1	batch_transfer	student_enrollment	210	division_id=53	division_id=54, reason=Performance stream reallocation	\N	\N	2026-11-04 12:34:53.261095+00
71	1	update	division	54	name=Audit Batch Beta, code=AUD-13-B, capacity=10, status=active	{'class_teacher_id': 121}	\N	\N	2026-11-04 12:34:53.561599+00
\.


--
-- Data for Name: boards; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.boards (id, institution_id, name, code, description, is_active, created_at) FROM stdin;
2	2	CBSE	CBSE	Central Board of Secondary Education	t	2026-11-03 19:49:08.545328+00
3	2	SSC	SSC	Secondary School Certificate (State Board)	t	2026-11-03 19:49:08.545328+00
1	2	ICSE	ICSE	Indian Certificate of Secondary Education	t	2026-11-03 19:49:08.545328+00
\.


--
-- Data for Name: data_import_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.data_import_logs (id, institution_id, academic_year_id, entity_type, import_mode, source_type, file_name, total_rows, successful_rows, failed_rows, status, error_summary, reconciliation_data, imported_by_id, created_at) FROM stdin;
\.


--
-- Data for Name: discounts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.discounts (id, institution_id, name, discount_type, value, description, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: divisions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.divisions (id, standard_id, name, capacity, class_teacher_id, is_active, created_at, board_id, code, room_number, schedule_timing, status) FROM stdin;
25	10	Batch A (Morning)	50	121	t	2026-11-03 19:26:16.621438+00	1	ICSE-X-A	Room 1	Mon - Fri, 07:00 AM - 09:00 AM	active
26	10	Batch A (Morning)	50	122	t	2026-11-03 19:26:16.621438+00	2	CBSE-X-A	Room 2	Mon - Fri, 07:00 AM - 09:00 AM	active
28	9	Batch A (Morning)	50	124	t	2026-11-03 19:26:16.621438+00	3	SSC-IX-A	Room 3	Mon - Fri, 07:00 AM - 09:00 AM	active
29	8	Batch A (Morning)	50	121	t	2026-11-03 19:26:16.621438+00	1	ICSE-VIII-A	Room 2	Mon - Fri, 09:15 AM - 11:15 AM	active
7	4	Batch A (Morning)	40	\N	t	2026-11-03 15:17:26.3504+00	1	ICSE-IV-A	Room 1	Mon - Fri, 09:15 AM - 11:15 AM	active
\.


--
-- Data for Name: exam_marks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.exam_marks (id, examination_id, student_id, subject_id, marks_obtained, grade, remarks, is_absent, created_at) FROM stdin;
379	15	156	37	43.50	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
380	15	156	38	47.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
381	15	156	39	35.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
382	15	156	40	38.50	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
383	16	156	37	87.00	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
384	16	156	38	94.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
385	16	156	39	70.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
386	16	156	40	77.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
387	19	163	7	39.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
388	19	163	8	42.50	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
389	19	163	9	46.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
390	19	163	10	34.00	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
391	20	163	7	78.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
392	20	163	8	85.00	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
393	20	163	9	92.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
394	20	163	10	68.00	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
395	19	167	7	45.50	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
396	19	167	8	33.50	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
397	19	167	9	37.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
398	19	167	10	40.50	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
399	20	167	7	91.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
400	20	167	8	67.00	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
401	20	167	9	74.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
402	20	167	10	81.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
403	15	155	37	38.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
404	15	155	38	41.50	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
405	15	155	39	45.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
406	15	155	40	33.00	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
407	16	155	37	76.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
408	16	155	38	83.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
409	16	155	39	90.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
410	16	155	40	66.00	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
411	21	129	1	32.50	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
412	21	129	2	36.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
413	21	129	3	39.50	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
414	21	129	4	43.00	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
415	22	129	1	65.00	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
416	22	129	2	72.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
417	22	129	3	79.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
418	22	129	4	86.00	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
419	21	130	1	38.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
420	21	130	2	41.50	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
421	21	130	3	45.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
422	21	130	4	33.00	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
423	22	130	1	76.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
424	22	130	2	83.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
425	22	130	3	90.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
426	22	130	4	66.00	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
427	21	131	1	43.50	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
428	21	131	2	47.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
429	21	131	3	35.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
430	21	131	4	38.50	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
431	22	131	1	87.00	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
432	22	131	2	94.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
433	22	131	3	70.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
434	22	131	4	77.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
435	21	132	1	33.50	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
436	21	132	2	37.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
437	21	132	3	40.50	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
438	21	132	4	44.00	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
439	22	132	1	67.00	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
440	22	132	2	74.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
441	22	132	3	81.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
442	22	132	4	88.00	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
443	21	133	1	39.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
444	21	133	2	42.50	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
445	21	133	3	46.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
446	21	133	4	34.00	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
447	22	133	1	78.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
448	22	133	2	85.00	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
449	22	133	3	92.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
450	22	133	4	68.00	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
451	21	134	1	44.50	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
452	21	134	2	32.50	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
453	21	134	3	36.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
454	21	134	4	39.50	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
455	22	134	1	89.00	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
456	22	134	2	65.00	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
457	22	134	3	72.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
458	22	134	4	79.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
459	21	135	1	34.50	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
460	21	135	2	38.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
461	21	135	3	41.50	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
462	21	135	4	45.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
463	22	135	1	69.00	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
464	22	135	2	76.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
465	22	135	3	83.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
466	22	135	4	90.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
467	21	136	1	40.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
468	21	136	2	43.50	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
469	21	136	3	47.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
470	21	136	4	35.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
471	22	136	1	80.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
472	22	136	2	87.00	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
473	22	136	3	94.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
474	22	136	4	70.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
475	21	138	1	35.50	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
476	21	138	2	39.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
477	21	138	3	42.50	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
478	21	138	4	46.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
479	22	138	1	71.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
480	22	138	2	78.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
481	22	138	3	85.00	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
482	22	138	4	92.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
483	21	139	1	41.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
484	21	139	2	44.50	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
485	21	139	3	32.50	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
486	21	139	4	36.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
487	22	139	1	82.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
488	22	139	2	89.00	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
489	22	139	3	65.00	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
490	22	139	4	72.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
491	21	140	1	46.50	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
492	21	140	2	34.50	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
493	21	140	3	38.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
494	21	140	4	41.50	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
495	22	140	1	93.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
496	22	140	2	69.00	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
497	22	140	3	76.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
498	22	140	4	83.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
499	21	141	1	36.50	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
500	21	141	2	40.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
501	21	141	3	43.50	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
502	21	141	4	47.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
503	22	141	1	73.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
504	22	141	2	80.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
505	22	141	3	87.00	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
506	22	141	4	94.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
507	21	137	1	45.50	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
508	21	137	2	33.50	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
509	21	137	3	37.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
510	21	137	4	40.50	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
511	22	137	1	91.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
512	22	137	2	67.00	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
513	22	137	3	74.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
514	22	137	4	81.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
515	17	157	13	42.50	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
516	17	157	14	46.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
517	17	157	15	34.00	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
518	17	157	16	37.50	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
519	18	157	13	85.00	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
520	18	157	14	92.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
521	18	157	15	68.00	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
522	18	157	16	75.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
523	17	158	13	32.50	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
524	17	158	14	36.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
525	17	158	15	39.50	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
526	17	158	16	43.00	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
527	18	158	13	65.00	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
528	18	158	14	72.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
529	18	158	15	79.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
530	18	158	16	86.00	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
531	17	159	13	38.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
532	17	159	14	41.50	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
533	17	159	15	45.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
534	17	159	16	33.00	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
535	18	159	13	76.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
536	18	159	14	83.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
537	18	159	15	90.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
538	18	159	16	66.00	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
539	17	160	13	43.50	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
540	17	160	14	47.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
541	17	160	15	35.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
542	17	160	16	38.50	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
543	18	160	13	87.00	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
544	18	160	14	94.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
545	18	160	15	70.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
546	18	160	16	77.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
547	17	161	13	33.50	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
548	17	161	14	37.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
549	17	161	15	40.50	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
550	17	161	16	44.00	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
551	18	161	13	67.00	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
552	18	161	14	74.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
553	18	161	15	81.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
554	18	161	16	88.00	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
555	19	162	7	33.50	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
556	19	162	8	37.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
557	19	162	9	40.50	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
558	19	162	10	44.00	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
559	20	162	7	67.00	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
560	20	162	8	74.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
561	20	162	9	81.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
562	20	162	10	88.00	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
563	19	164	7	44.50	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
564	19	164	8	32.50	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
565	19	164	9	36.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
566	19	164	10	39.50	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
567	20	164	7	89.00	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
568	20	164	8	65.00	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
569	20	164	9	72.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
570	20	164	10	79.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
571	19	165	7	34.50	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
572	19	165	8	38.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
573	19	165	9	41.50	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
574	19	165	10	45.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
575	20	165	7	69.00	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
576	20	165	8	76.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
577	20	165	9	83.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
578	20	165	10	90.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
579	19	166	7	40.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
580	19	166	8	43.50	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
581	19	166	9	47.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
582	19	166	10	35.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
583	20	166	7	80.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
584	20	166	8	87.00	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
585	20	166	9	94.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
586	20	166	10	70.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
587	15	142	37	44.00	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
588	15	142	38	47.50	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
589	15	142	39	35.50	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
590	15	142	40	39.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
591	16	142	37	88.00	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
592	16	142	38	95.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
593	16	142	39	71.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
594	16	142	40	78.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
595	15	143	37	34.00	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
596	15	143	38	37.50	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
597	15	143	39	41.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
598	15	143	40	44.50	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
599	16	143	37	68.00	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
600	16	143	38	75.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
601	16	143	39	82.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
602	16	143	40	89.00	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
603	15	144	37	39.50	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
604	15	144	38	43.00	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
605	15	144	39	46.50	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
606	15	144	40	34.50	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
607	16	144	37	79.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
608	16	144	38	86.00	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
609	16	144	39	93.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
610	16	144	40	69.00	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
611	15	145	37	45.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
612	15	145	38	33.00	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
613	15	145	39	36.50	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
614	15	145	40	40.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
615	16	145	37	90.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
616	16	145	38	66.00	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
617	16	145	39	73.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
618	16	145	40	80.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
619	15	146	37	35.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
620	15	146	38	38.50	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
621	15	146	39	42.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
622	15	146	40	45.50	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
623	16	146	37	70.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
624	16	146	38	77.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
625	16	146	39	84.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
626	16	146	40	91.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
627	15	147	37	40.50	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
628	15	147	38	44.00	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
629	15	147	39	47.50	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
630	15	147	40	35.50	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
631	16	147	37	81.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
632	16	147	38	88.00	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
633	16	147	39	95.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
634	16	147	40	71.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
635	15	148	37	46.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
636	15	148	38	34.00	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
637	15	148	39	37.50	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
638	15	148	40	41.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
639	16	148	37	92.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
640	16	148	38	68.00	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
641	16	148	39	75.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
642	16	148	40	82.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
643	15	149	37	36.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
644	15	149	38	39.50	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
645	15	149	39	43.00	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
646	15	149	40	46.50	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
647	16	149	37	72.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
648	16	149	38	79.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
649	16	149	39	86.00	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
650	16	149	40	93.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
651	15	150	37	41.50	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
652	15	150	38	45.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
653	15	150	39	33.00	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
654	15	150	40	36.50	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
655	16	150	37	83.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
656	16	150	38	90.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
657	16	150	39	66.00	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
658	16	150	40	73.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
659	15	151	37	47.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
660	15	151	38	35.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
661	15	151	39	38.50	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
662	15	151	40	42.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
663	16	151	37	94.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
664	16	151	38	70.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
665	16	151	39	77.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
666	16	151	40	84.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
667	15	152	37	37.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
668	15	152	38	40.50	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
669	15	152	39	44.00	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
670	15	152	40	47.50	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
671	16	152	37	74.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
672	16	152	38	81.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
673	16	152	39	88.00	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
674	16	152	40	95.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
675	15	153	37	42.50	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
676	15	153	38	46.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
677	15	153	39	34.00	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
678	15	153	40	37.50	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
679	16	153	37	85.00	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
680	16	153	38	92.00	A+	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
681	16	153	39	68.00	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
682	16	153	40	75.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
683	15	154	37	32.50	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
684	15	154	38	36.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
685	15	154	39	39.50	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
686	15	154	40	43.00	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
687	16	154	37	65.00	B+	Needs revision in numericals	f	2026-11-04 14:26:35.769607+00
688	16	154	38	72.00	B+	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
689	16	154	39	79.00	A	Good progress, keep practicing	f	2026-11-04 14:26:35.769607+00
690	16	154	40	86.00	A	Outstanding conceptual clarity	f	2026-11-04 14:26:35.769607+00
\.


--
-- Data for Name: examinations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.examinations (id, academic_year_id, standard_id, name, exam_type, start_date, end_date, max_marks, passing_marks, is_active, created_at) FROM stdin;
15	1	4	Unit Test 1 (Term 1)	Unit Test	2024-07-22	2024-07-26	50	18	t	2026-11-04 14:26:35.769607+00
16	1	4	Mid-Term Examination 2024	Semester Exam	2024-09-20	2024-09-28	100	35	t	2026-11-04 14:26:35.769607+00
17	1	8	Unit Test 1 (Term 1)	Unit Test	2024-07-22	2024-07-26	50	18	t	2026-11-04 14:26:35.769607+00
18	1	8	Mid-Term Examination 2024	Semester Exam	2024-09-20	2024-09-28	100	35	t	2026-11-04 14:26:35.769607+00
19	1	9	Unit Test 1 (Term 1)	Unit Test	2024-07-22	2024-07-27	50	18	t	2026-11-04 14:26:35.769607+00
20	1	9	Mid-Term Examination 2024	Semester Exam	2024-09-20	2024-09-30	100	35	t	2026-11-04 14:26:35.769607+00
21	1	10	Unit Test 1 (Term 1)	Unit Test	2024-07-20	2024-07-28	50	18	t	2026-11-04 14:26:35.769607+00
22	1	10	Mid-Term Examination 2024	Semester Exam	2024-09-20	2024-10-01	100	35	t	2026-11-04 14:26:35.769607+00
23	1	10	Pre-Board Mock Series 1	Model Exam	2024-11-20	2024-12-02	100	35	t	2026-11-04 14:26:35.769607+00
\.


--
-- Data for Name: fee_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fee_categories (id, institution_id, name, description, is_active, created_at) FROM stdin;
1	2	Tuition Fee	\N	t	2026-11-03 15:17:26.3504+00
2	2	Admission Fee	\N	t	2026-11-03 15:17:26.3504+00
3	2	Examination Fee	\N	t	2026-11-03 15:17:26.3504+00
4	2	Transport Fee	\N	t	2026-11-03 15:17:26.3504+00
5	2	Sports Fee	\N	t	2026-11-03 15:17:26.3504+00
6	2	Library Fee	\N	t	2026-11-03 15:17:26.3504+00
7	2	Coaching Tuition Fee	Coaching and tuition fee	t	2026-11-03 19:26:16.621438+00
\.


--
-- Data for Name: fee_installments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fee_installments (id, invoice_id, installment_number, description, amount, paid_amount, due_date, status, late_fee_applied, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: fee_invoice_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fee_invoice_items (id, invoice_id, fee_structure_id, description, amount, discount_amount, net_amount, created_at) FROM stdin;
1	1	1	Annual Academic & Coaching Tuition Fee (2026 - 27)	30000.00	0.00	30000.00	2026-11-04 11:14:22.322779+00
2	2	2	Annual Academic & Coaching Tuition Fee (2026 - 27)	45000.00	0.00	45000.00	2026-11-04 11:14:22.322779+00
3	3	3	Annual Academic & Coaching Tuition Fee (2026 - 27)	80000.00	0.00	80000.00	2026-11-04 11:14:22.322779+00
4	4	4	Annual Academic & Coaching Tuition Fee (2026 - 27)	85000.00	0.00	85000.00	2026-11-04 11:14:22.322779+00
5	5	5	Annual Academic & Coaching Tuition Fee (2026 - 27)	95000.00	0.00	95000.00	2026-11-04 11:14:22.322779+00
6	6	6	Annual Academic & Coaching Tuition Fee (2026 - 27)	95000.00	0.00	95000.00	2026-11-04 11:14:22.322779+00
7	7	7	Annual Academic & Coaching Tuition Fee (2026 - 27)	90000.00	0.00	90000.00	2026-11-04 11:14:22.322779+00
8	8	8	Annual Academic & Coaching Tuition Fee (2026 - 27)	60000.00	0.00	60000.00	2026-11-04 11:14:22.322779+00
9	9	9	Annual Academic & Coaching Tuition Fee (2026 - 27)	95000.00	0.00	95000.00	2026-11-04 11:14:22.322779+00
10	10	10	Annual Academic & Coaching Tuition Fee (2026 - 27)	85000.00	0.00	85000.00	2026-11-04 11:14:22.322779+00
11	11	11	Annual Academic & Coaching Tuition Fee (2026 - 27)	95000.00	0.00	95000.00	2026-11-04 11:14:22.322779+00
12	12	12	Annual Academic & Coaching Tuition Fee (2026 - 27)	80000.00	0.00	80000.00	2026-11-04 11:14:22.322779+00
13	13	13	Annual Academic & Coaching Tuition Fee (2026 - 27)	60000.00	0.00	60000.00	2026-11-04 11:14:22.322779+00
14	14	14	Annual Academic & Coaching Tuition Fee (2026 - 27)	85000.00	0.00	85000.00	2026-11-04 11:14:22.322779+00
15	15	15	Annual Academic & Coaching Tuition Fee (2026 - 27)	80000.00	0.00	80000.00	2026-11-04 11:14:22.322779+00
16	16	16	Annual Academic & Coaching Tuition Fee (2026 - 27)	85000.00	0.00	85000.00	2026-11-04 11:14:22.322779+00
17	17	17	Annual Academic & Coaching Tuition Fee (2026 - 27)	90000.00	0.00	90000.00	2026-11-04 11:14:22.322779+00
18	18	18	Annual Academic & Coaching Tuition Fee (2026 - 27)	75000.00	0.00	75000.00	2026-11-04 11:14:22.322779+00
19	19	19	Annual Academic & Coaching Tuition Fee (2026 - 27)	75000.00	0.00	75000.00	2026-11-04 11:14:22.322779+00
20	20	20	Annual Academic & Coaching Tuition Fee (2026 - 27)	75000.00	0.00	75000.00	2026-11-04 11:14:22.322779+00
21	21	21	Annual Academic & Coaching Tuition Fee (2026 - 27)	50000.00	0.00	50000.00	2026-11-04 11:14:22.322779+00
22	22	22	Annual Academic & Coaching Tuition Fee (2026 - 27)	50000.00	0.00	50000.00	2026-11-04 11:14:22.322779+00
23	23	23	Annual Academic & Coaching Tuition Fee (2026 - 27)	50000.00	0.00	50000.00	2026-11-04 11:14:22.322779+00
24	24	24	Annual Academic & Coaching Tuition Fee (2026 - 27)	80000.00	0.00	80000.00	2026-11-04 11:14:22.322779+00
25	25	25	Annual Academic & Coaching Tuition Fee (2026 - 27)	85000.00	0.00	85000.00	2026-11-04 11:14:22.322779+00
26	26	26	Annual Academic & Coaching Tuition Fee (2026 - 27)	85000.00	0.00	85000.00	2026-11-04 11:14:22.322779+00
27	27	27	Annual Academic & Coaching Tuition Fee (2026 - 27)	85000.00	0.00	85000.00	2026-11-04 11:14:22.322779+00
28	28	28	Annual Academic & Coaching Tuition Fee (2026 - 27)	85000.00	0.00	85000.00	2026-11-04 11:14:22.322779+00
29	29	29	Annual Academic & Coaching Tuition Fee (2026 - 27)	85000.00	0.00	85000.00	2026-11-04 11:14:22.322779+00
30	30	30	Annual Academic & Coaching Tuition Fee (2026 - 27)	85000.00	0.00	85000.00	2026-11-04 11:14:22.322779+00
31	31	31	Annual Academic & Coaching Tuition Fee (2026 - 27)	85000.00	0.00	85000.00	2026-11-04 11:14:22.322779+00
32	32	32	Annual Academic & Coaching Tuition Fee (2026 - 27)	80000.00	0.00	80000.00	2026-11-04 11:14:22.322779+00
33	33	33	Annual Academic & Coaching Tuition Fee (2026 - 27)	85000.00	0.00	85000.00	2026-11-04 11:14:22.322779+00
34	34	34	Annual Academic & Coaching Tuition Fee (2026 - 27)	65000.00	0.00	65000.00	2026-11-04 11:14:22.322779+00
35	35	35	Annual Academic & Coaching Tuition Fee (2026 - 27)	85000.00	0.00	85000.00	2026-11-04 11:14:22.322779+00
36	36	36	Annual Academic & Coaching Tuition Fee (2026 - 27)	70000.00	0.00	70000.00	2026-11-04 11:14:22.322779+00
\.


--
-- Data for Name: fee_invoices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fee_invoices (id, invoice_number, student_id, assignment_id, academic_year_id, total_amount, discount_amount, net_amount, paid_amount, outstanding_amount, status, issue_date, due_date, notes, created_at, updated_at) FROM stdin;
1	INV-2026-0156	156	1	1	30000.00	0.00	30000.00	15000.00	15000.00	partial	2026-04-01	2027-03-31	Authoritative fee invoice for Rida imported from Padata.xlsx	2026-11-04 11:14:22.322779+00	2026-11-04 11:14:22.322779+00
2	INV-2026-0163	163	2	1	45000.00	0.00	45000.00	20000.00	25000.00	partial	2026-04-01	2027-03-31	Authoritative fee invoice for Aditya imported from Padata.xlsx	2026-11-04 11:14:22.322779+00	2026-11-04 11:14:22.322779+00
3	INV-2026-0155	155	3	1	80000.00	0.00	80000.00	48000.00	32000.00	partial	2026-04-01	2027-03-31	Authoritative fee invoice for Aadya imported from Padata.xlsx	2026-11-04 11:14:22.322779+00	2026-11-04 11:14:22.322779+00
4	INV-2026-0137	137	4	1	85000.00	0.00	85000.00	68000.00	17000.00	partial	2026-04-01	2027-03-31	Authoritative fee invoice for Raudrita imported from Padata.xlsx	2026-11-04 11:14:22.322779+00	2026-11-04 11:14:22.322779+00
5	INV-2026-0129	129	5	1	95000.00	0.00	95000.00	66500.00	28500.00	partial	2026-04-01	2027-03-31	Authoritative fee invoice for Rajnees imported from Padata.xlsx	2026-11-04 11:14:22.322779+00	2026-11-04 11:14:22.322779+00
6	INV-2026-0130	130	6	1	95000.00	0.00	95000.00	66500.00	28500.00	partial	2026-04-01	2027-03-31	Authoritative fee invoice for Ayaan imported from Padata.xlsx	2026-11-04 11:14:22.322779+00	2026-11-04 11:14:22.322779+00
7	INV-2026-0131	131	7	1	90000.00	0.00	90000.00	65000.00	25000.00	partial	2026-04-01	2027-03-31	Authoritative fee invoice for Netham imported from Padata.xlsx	2026-11-04 11:14:22.322779+00	2026-11-04 11:14:22.322779+00
8	INV-2026-0132	132	8	1	60000.00	0.00	60000.00	45000.00	15000.00	partial	2026-04-01	2027-03-31	Authoritative fee invoice for Shreshta imported from Padata.xlsx	2026-11-04 11:14:22.322779+00	2026-11-04 11:14:22.322779+00
9	INV-2026-0133	133	9	1	95000.00	0.00	95000.00	85700.00	9300.00	partial	2026-04-01	2027-03-31	Authoritative fee invoice for Savesh imported from Padata.xlsx	2026-11-04 11:14:22.322779+00	2026-11-04 11:14:22.322779+00
10	INV-2026-0134	134	10	1	85000.00	0.00	85000.00	51000.00	34000.00	partial	2026-04-01	2027-03-31	Authoritative fee invoice for Ansh imported from Padata.xlsx	2026-11-04 11:14:22.322779+00	2026-11-04 11:14:22.322779+00
11	INV-2026-0135	135	11	1	95000.00	0.00	95000.00	35000.00	60000.00	partial	2026-04-01	2027-03-31	Authoritative fee invoice for Riddhima imported from Padata.xlsx	2026-11-04 11:14:22.322779+00	2026-11-04 11:14:22.322779+00
12	INV-2026-0136	136	12	1	80000.00	0.00	80000.00	55000.00	25000.00	partial	2026-04-01	2027-03-31	Authoritative fee invoice for Sonakshi imported from Padata.xlsx	2026-11-04 11:14:22.322779+00	2026-11-04 11:14:22.322779+00
13	INV-2026-0138	138	13	1	60000.00	0.00	60000.00	45000.00	15000.00	partial	2026-04-01	2027-03-31	Authoritative fee invoice for Samruddhi imported from Padata.xlsx	2026-11-04 11:14:22.322779+00	2026-11-04 11:14:22.322779+00
14	INV-2026-0139	139	14	1	85000.00	0.00	85000.00	80000.00	5000.00	partial	2026-04-01	2027-03-31	Authoritative fee invoice for Aman imported from Padata.xlsx	2026-11-04 11:14:22.322779+00	2026-11-04 11:14:22.322779+00
15	INV-2026-0140	140	15	1	80000.00	0.00	80000.00	57700.00	22300.00	partial	2026-04-01	2027-03-31	Authoritative fee invoice for Ashwin imported from Padata.xlsx	2026-11-04 11:14:22.322779+00	2026-11-04 11:14:22.322779+00
16	INV-2026-0141	141	16	1	85000.00	0.00	85000.00	50000.00	35000.00	partial	2026-04-01	2027-03-31	Authoritative fee invoice for Keshwa imported from Padata.xlsx	2026-11-04 11:14:22.322779+00	2026-11-04 11:14:22.322779+00
17	INV-2026-0157	157	17	1	90000.00	0.00	90000.00	50000.00	40000.00	partial	2026-04-01	2027-03-31	Authoritative fee invoice for Puneeta imported from Padata.xlsx	2026-11-04 11:14:22.322779+00	2026-11-04 11:14:22.322779+00
18	INV-2026-0158	158	18	1	75000.00	0.00	75000.00	45000.00	30000.00	partial	2026-04-01	2027-03-31	Authoritative fee invoice for Aliya imported from Padata.xlsx	2026-11-04 11:14:22.322779+00	2026-11-04 11:14:22.322779+00
19	INV-2026-0159	159	19	1	75000.00	0.00	75000.00	75000.00	0.00	paid	2026-04-01	2027-03-31	Authoritative fee invoice for Siddhant imported from Padata.xlsx	2026-11-04 11:14:22.322779+00	2026-11-04 11:14:22.322779+00
20	INV-2026-0161	161	20	1	75000.00	0.00	75000.00	45000.00	30000.00	partial	2026-04-01	2027-03-31	Authoritative fee invoice for Chehek imported from Padata.xlsx	2026-11-04 11:14:22.322779+00	2026-11-04 11:14:22.322779+00
21	INV-2026-0162	162	21	1	50000.00	0.00	50000.00	50000.00	0.00	paid	2026-04-01	2027-03-31	Authoritative fee invoice for Siddharth imported from Padata.xlsx	2026-11-04 11:14:22.322779+00	2026-11-04 11:14:22.322779+00
22	INV-2026-0164	164	22	1	50000.00	0.00	50000.00	25000.00	25000.00	partial	2026-04-01	2027-03-31	Authoritative fee invoice for Shriya imported from Padata.xlsx	2026-11-04 11:14:22.322779+00	2026-11-04 11:14:22.322779+00
23	INV-2026-0165	165	23	1	50000.00	0.00	50000.00	30000.00	20000.00	partial	2026-04-01	2027-03-31	Authoritative fee invoice for Sukhmeet imported from Padata.xlsx	2026-11-04 11:14:22.322779+00	2026-11-04 11:14:22.322779+00
24	INV-2026-0142	142	24	1	80000.00	0.00	80000.00	22000.00	58000.00	partial	2026-04-01	2027-03-31	Authoritative fee invoice for Satnam imported from Padata.xlsx	2026-11-04 11:14:22.322779+00	2026-11-04 11:14:22.322779+00
25	INV-2026-0143	143	25	1	85000.00	0.00	85000.00	59500.00	25500.00	partial	2026-04-01	2027-03-31	Authoritative fee invoice for Samud imported from Padata.xlsx	2026-11-04 11:14:22.322779+00	2026-11-04 11:14:22.322779+00
26	INV-2026-0144	144	26	1	85000.00	0.00	85000.00	50600.00	34400.00	partial	2026-04-01	2027-03-31	Authoritative fee invoice for Simran imported from Padata.xlsx	2026-11-04 11:14:22.322779+00	2026-11-04 11:14:22.322779+00
27	INV-2026-0145	145	27	1	85000.00	0.00	85000.00	75000.00	10000.00	partial	2026-04-01	2027-03-31	Authoritative fee invoice for Kashish imported from Padata.xlsx	2026-11-04 11:14:22.322779+00	2026-11-04 11:14:22.322779+00
28	INV-2026-0146	146	28	1	85000.00	0.00	85000.00	41000.00	44000.00	partial	2026-04-01	2027-03-31	Authoritative fee invoice for Vedant imported from Padata.xlsx	2026-11-04 11:14:22.322779+00	2026-11-04 11:14:22.322779+00
29	INV-2026-0147	147	29	1	85000.00	0.00	85000.00	24900.00	60100.00	partial	2026-04-01	2027-03-31	Authoritative fee invoice for Khushi imported from Padata.xlsx	2026-11-04 11:14:22.322779+00	2026-11-04 11:14:22.322779+00
30	INV-2026-0148	148	30	1	85000.00	0.00	85000.00	34000.00	51000.00	partial	2026-04-01	2027-03-31	Authoritative fee invoice for Mahek imported from Padata.xlsx	2026-11-04 11:14:22.322779+00	2026-11-04 11:14:22.322779+00
31	INV-2026-0149	149	31	1	85000.00	0.00	85000.00	68100.00	16900.00	partial	2026-04-01	2027-03-31	Authoritative fee invoice for Johan imported from Padata.xlsx	2026-11-04 11:14:22.322779+00	2026-11-04 11:14:22.322779+00
32	INV-2026-0150	150	32	1	80000.00	0.00	80000.00	56000.00	24000.00	partial	2026-04-01	2027-03-31	Authoritative fee invoice for Avner imported from Padata.xlsx	2026-11-04 11:14:22.322779+00	2026-11-04 11:14:22.322779+00
33	INV-2026-0151	151	33	1	85000.00	0.00	85000.00	50000.00	35000.00	partial	2026-04-01	2027-03-31	Authoritative fee invoice for Apika imported from Padata.xlsx	2026-11-04 11:14:22.322779+00	2026-11-04 11:14:22.322779+00
34	INV-2026-0152	152	34	1	65000.00	0.00	65000.00	30000.00	35000.00	partial	2026-04-01	2027-03-31	Authoritative fee invoice for Shrawya imported from Padata.xlsx	2026-11-04 11:14:22.322779+00	2026-11-04 11:14:22.322779+00
35	INV-2026-0153	153	35	1	85000.00	0.00	85000.00	85000.00	0.00	paid	2026-04-01	2027-03-31	Authoritative fee invoice for Afton imported from Padata.xlsx	2026-11-04 11:14:22.322779+00	2026-11-04 11:14:22.322779+00
36	INV-2026-0154	154	36	1	70000.00	0.00	70000.00	50000.00	20000.00	partial	2026-04-01	2027-03-31	Authoritative fee invoice for Maahi imported from Padata.xlsx	2026-11-04 11:14:22.322779+00	2026-11-04 11:14:22.322779+00
\.


--
-- Data for Name: fee_register_imports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fee_register_imports (id, file_name, file_hash, academic_year_id, institution_id, imported_students_count, imported_payments_count, total_fees, total_collected, total_outstanding, reconciliation_summary, status, imported_by_id, created_at) FROM stdin;
1	Padata.xlsx	05e9b175b7b77c180f899b0cd74c82603fdae6be00b75364bbfef1aee382e20d	1	2	36	170	2770000.00	1819500.00	950500.00	{"source_file": "Padata.xlsx", "file_sha256": "05e9b175b7b77c180f899b0cd74c82603fdae6be00b75364bbfef1aee382e20d", "file_size_bytes": 13421, "total_rows_parsed": 170, "unique_students": 36, "total_fee_obligation": 2770000.0, "total_payments_sum": 1819500.0, "total_outstanding": 950500.0, "collection_rate_percent": 65.69, "anomalies_handled": [{"row": 170, "student": "Ashwin", "issue": "Invalid date '31-Sep-2026' (September has 30 days)", "resolution": "Clamped to valid month-end '2026-09-30'"}, {"rows": [107, 108], "student": "Keshwa", "issue": "Identical installment rows [107, 108] for Rs 10,000.00 on 2026-08-05", "resolution": "Preserved both valid installment payments per authoritative ledger total"}], "timestamp": "2026-11-04T11:14:23.661038"}	completed	1	2026-11-04 11:14:22.322779+00
\.


--
-- Data for Name: fee_structures; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fee_structures (id, institution_id, academic_year_id, standard_id, category_id, name, amount, frequency, installments_count, due_day, late_fee_amount, late_fee_days, is_active, created_at) FROM stdin;
1	2	1	4	1	Annual Tuition Fee - Rida	30000.00	annually	1	10	0.00	0	t	2026-11-04 11:14:22.322779+00
2	2	1	9	1	Annual Tuition Fee - Aditya	45000.00	annually	1	10	0.00	0	t	2026-11-04 11:14:22.322779+00
3	2	1	4	1	Annual Tuition Fee - Aadya	80000.00	annually	1	10	0.00	0	t	2026-11-04 11:14:22.322779+00
4	2	1	10	1	Annual Tuition Fee - Raudrita	85000.00	annually	1	10	0.00	0	t	2026-11-04 11:14:22.322779+00
5	2	1	10	1	Annual Tuition Fee - Rajnees	95000.00	annually	1	10	0.00	0	t	2026-11-04 11:14:22.322779+00
6	2	1	10	1	Annual Tuition Fee - Ayaan	95000.00	annually	1	10	0.00	0	t	2026-11-04 11:14:22.322779+00
7	2	1	10	1	Annual Tuition Fee - Netham	90000.00	annually	1	10	0.00	0	t	2026-11-04 11:14:22.322779+00
8	2	1	10	1	Annual Tuition Fee - Shreshta	60000.00	annually	1	10	0.00	0	t	2026-11-04 11:14:22.322779+00
9	2	1	10	1	Annual Tuition Fee - Savesh	95000.00	annually	1	10	0.00	0	t	2026-11-04 11:14:22.322779+00
10	2	1	10	1	Annual Tuition Fee - Ansh	85000.00	annually	1	10	0.00	0	t	2026-11-04 11:14:22.322779+00
11	2	1	10	1	Annual Tuition Fee - Riddhima	95000.00	annually	1	10	0.00	0	t	2026-11-04 11:14:22.322779+00
12	2	1	10	1	Annual Tuition Fee - Sonakshi	80000.00	annually	1	10	0.00	0	t	2026-11-04 11:14:22.322779+00
13	2	1	10	1	Annual Tuition Fee - Samruddhi	60000.00	annually	1	10	0.00	0	t	2026-11-04 11:14:22.322779+00
14	2	1	10	1	Annual Tuition Fee - Aman	85000.00	annually	1	10	0.00	0	t	2026-11-04 11:14:22.322779+00
15	2	1	10	1	Annual Tuition Fee - Ashwin	80000.00	annually	1	10	0.00	0	t	2026-11-04 11:14:22.322779+00
16	2	1	10	1	Annual Tuition Fee - Keshwa	85000.00	annually	1	10	0.00	0	t	2026-11-04 11:14:22.322779+00
17	2	1	8	1	Annual Tuition Fee - Puneeta	90000.00	annually	1	10	0.00	0	t	2026-11-04 11:14:22.322779+00
18	2	1	8	1	Annual Tuition Fee - Aliya	75000.00	annually	1	10	0.00	0	t	2026-11-04 11:14:22.322779+00
19	2	1	8	1	Annual Tuition Fee - Siddhant	75000.00	annually	1	10	0.00	0	t	2026-11-04 11:14:22.322779+00
20	2	1	8	1	Annual Tuition Fee - Chehek	75000.00	annually	1	10	0.00	0	t	2026-11-04 11:14:22.322779+00
21	2	1	9	1	Annual Tuition Fee - Siddharth	50000.00	annually	1	10	0.00	0	t	2026-11-04 11:14:22.322779+00
22	2	1	9	1	Annual Tuition Fee - Shriya	50000.00	annually	1	10	0.00	0	t	2026-11-04 11:14:22.322779+00
23	2	1	9	1	Annual Tuition Fee - Sukhmeet	50000.00	annually	1	10	0.00	0	t	2026-11-04 11:14:22.322779+00
24	2	1	4	1	Annual Tuition Fee - Satnam	80000.00	annually	1	10	0.00	0	t	2026-11-04 11:14:22.322779+00
25	2	1	4	1	Annual Tuition Fee - Samud	85000.00	annually	1	10	0.00	0	t	2026-11-04 11:14:22.322779+00
26	2	1	4	1	Annual Tuition Fee - Simran	85000.00	annually	1	10	0.00	0	t	2026-11-04 11:14:22.322779+00
27	2	1	4	1	Annual Tuition Fee - Kashish	85000.00	annually	1	10	0.00	0	t	2026-11-04 11:14:22.322779+00
28	2	1	4	1	Annual Tuition Fee - Vedant	85000.00	annually	1	10	0.00	0	t	2026-11-04 11:14:22.322779+00
29	2	1	4	1	Annual Tuition Fee - Khushi	85000.00	annually	1	10	0.00	0	t	2026-11-04 11:14:22.322779+00
30	2	1	4	1	Annual Tuition Fee - Mahek	85000.00	annually	1	10	0.00	0	t	2026-11-04 11:14:22.322779+00
31	2	1	4	1	Annual Tuition Fee - Johan	85000.00	annually	1	10	0.00	0	t	2026-11-04 11:14:22.322779+00
32	2	1	4	1	Annual Tuition Fee - Avner	80000.00	annually	1	10	0.00	0	t	2026-11-04 11:14:22.322779+00
33	2	1	4	1	Annual Tuition Fee - Apika	85000.00	annually	1	10	0.00	0	t	2026-11-04 11:14:22.322779+00
34	2	1	4	1	Annual Tuition Fee - Shrawya	65000.00	annually	1	10	0.00	0	t	2026-11-04 11:14:22.322779+00
35	2	1	4	1	Annual Tuition Fee - Afton	85000.00	annually	1	10	0.00	0	t	2026-11-04 11:14:22.322779+00
36	2	1	4	1	Annual Tuition Fee - Maahi	70000.00	annually	1	10	0.00	0	t	2026-11-04 11:14:22.322779+00
\.


--
-- Data for Name: guardians; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.guardians (id, student_id, relation, first_name, last_name, occupation, phone, email, aadhar_number, annual_income, is_primary, created_at) FROM stdin;
2	129	Father	Rajendra	Sharma	Software Engineer	+91-9819018822	father.rajnees@example.com	567812342000	1200000	t	2026-11-04 08:43:43.87947+00
3	129	Mother	Sunita	Sharma	Chartered Accountant	+91-9819018823	mother.rajnees@example.com	567812343000	850000	f	2026-11-04 08:43:43.87947+00
4	130	Father	Rajendra	Verma	Business Executive	+91-9819028822	father.ayaan@example.com	567812342001	1250000	t	2026-11-04 08:43:43.87947+00
5	130	Mother	Sunita	Verma	Doctor	+91-9819028823	mother.ayaan@example.com	567812343001	890000	f	2026-11-04 08:43:43.87947+00
6	131	Father	Rajendra	Patil	Chartered Accountant	+91-9819038822	father.netham@example.com	567812342002	1300000	t	2026-11-04 08:43:43.87947+00
7	131	Mother	Sunita	Patil	Civil Architect	+91-9819038823	mother.netham@example.com	567812343002	930000	f	2026-11-04 08:43:43.87947+00
8	132	Father	Rajendra	Deshmukh	Doctor	+91-9819048822	father.shreshta@example.com	567812342003	1350000	t	2026-11-04 08:43:43.87947+00
9	132	Mother	Sunita	Deshmukh	Professor	+91-9819048823	mother.shreshta@example.com	567812343003	970000	f	2026-11-04 08:43:43.87947+00
10	133	Father	Rajendra	Kulkarni	Civil Architect	+91-9819058822	father.savesh@example.com	567812342004	1400000	t	2026-11-04 08:43:43.87947+00
11	133	Mother	Sunita	Kulkarni	Government Officer	+91-9819058823	mother.savesh@example.com	567812343004	1010000	f	2026-11-04 08:43:43.87947+00
12	134	Father	Rajendra	Joshi	Professor	+91-9819068822	father.ansh@example.com	567812342005	1450000	t	2026-11-04 08:43:43.87947+00
13	134	Mother	Sunita	Joshi	Commercial Banker	+91-9819068823	mother.ansh@example.com	567812343005	1050000	f	2026-11-04 08:43:43.87947+00
14	135	Father	Rajendra	Mehta	Government Officer	+91-9819078822	father.riddhima@example.com	567812342006	1500000	t	2026-11-04 08:43:43.87947+00
15	135	Mother	Sunita	Mehta	Software Engineer	+91-9819078823	mother.riddhima@example.com	567812343006	1090000	f	2026-11-04 08:43:43.87947+00
16	136	Father	Rajendra	Shah	Commercial Banker	+91-9819088822	father.sonakshi@example.com	567812342007	1550000	t	2026-11-04 08:43:43.87947+00
17	136	Mother	Sunita	Shah	Business Executive	+91-9819088823	mother.sonakshi@example.com	567812343007	1130000	f	2026-11-04 08:43:43.87947+00
18	137	Father	Rajendra	Pawar	Software Engineer	+91-9819098822	father.raudrita@example.com	567812342008	1600000	t	2026-11-04 08:43:43.87947+00
19	137	Mother	Sunita	Pawar	Chartered Accountant	+91-9819098823	mother.raudrita@example.com	567812343008	1170000	f	2026-11-04 08:43:43.87947+00
20	138	Father	Rajendra	Bhide	Business Executive	+91-9819108822	father.samruddhi@example.com	567812342009	1650000	t	2026-11-04 08:43:43.87947+00
21	138	Mother	Sunita	Bhide	Doctor	+91-9819108823	mother.samruddhi@example.com	567812343009	1210000	f	2026-11-04 08:43:43.87947+00
22	139	Father	Rajendra	Chavan	Chartered Accountant	+91-9819118822	father.aman@example.com	567812342010	1700000	t	2026-11-04 08:43:43.87947+00
23	139	Mother	Sunita	Chavan	Civil Architect	+91-9819118823	mother.aman@example.com	567812343010	1250000	f	2026-11-04 08:43:43.87947+00
24	140	Father	Rajendra	Tambe	Doctor	+91-9819128822	father.ashwin@example.com	567812342011	1750000	t	2026-11-04 08:43:43.87947+00
25	140	Mother	Sunita	Tambe	Professor	+91-9819128823	mother.ashwin@example.com	567812343011	1290000	f	2026-11-04 08:43:43.87947+00
26	141	Father	Rajendra	Mistry	Civil Architect	+91-9819138822	father.keshwa@example.com	567812342012	1800000	t	2026-11-04 08:43:43.87947+00
27	141	Mother	Sunita	Mistry	Government Officer	+91-9819138823	mother.keshwa@example.com	567812343012	1330000	f	2026-11-04 08:43:43.87947+00
28	142	Father	Rajendra	Bhatia	Professor	+91-9819148822	father.satnam@example.com	567812342013	1850000	t	2026-11-04 08:43:43.87947+00
29	142	Mother	Sunita	Bhatia	Commercial Banker	+91-9819148823	mother.satnam@example.com	567812343013	1370000	f	2026-11-04 08:43:43.87947+00
30	143	Father	Rajendra	Kapoor	Government Officer	+91-9819158822	father.samud@example.com	567812342014	1900000	t	2026-11-04 08:43:43.87947+00
31	143	Mother	Sunita	Kapoor	Software Engineer	+91-9819158823	mother.samud@example.com	567812343014	1410000	f	2026-11-04 08:43:43.87947+00
32	144	Father	Rajendra	Malhotra	Commercial Banker	+91-9819168822	father.simran@example.com	567812342015	1950000	t	2026-11-04 08:43:43.87947+00
33	144	Mother	Sunita	Malhotra	Business Executive	+91-9819168823	mother.simran@example.com	567812343015	1450000	f	2026-11-04 08:43:43.87947+00
34	145	Father	Rajendra	Sawant	Software Engineer	+91-9819178822	father.kashish@example.com	567812342016	2000000	t	2026-11-04 08:43:43.87947+00
35	145	Mother	Sunita	Sawant	Chartered Accountant	+91-9819178823	mother.kashish@example.com	567812343016	1490000	f	2026-11-04 08:43:43.87947+00
36	146	Father	Rajendra	Gokhale	Business Executive	+91-9819188822	father.vedant@example.com	567812342017	2050000	t	2026-11-04 08:43:43.87947+00
37	146	Mother	Sunita	Gokhale	Doctor	+91-9819188823	mother.vedant@example.com	567812343017	1530000	f	2026-11-04 08:43:43.87947+00
38	147	Father	Rajendra	Gadgil	Chartered Accountant	+91-9819198822	father.khushi@example.com	567812342018	2100000	t	2026-11-04 08:43:43.87947+00
39	147	Mother	Sunita	Gadgil	Civil Architect	+91-9819198823	mother.khushi@example.com	567812343018	1570000	f	2026-11-04 08:43:43.87947+00
40	148	Father	Rajendra	Nair	Doctor	+91-9819208822	father.mahek@example.com	567812342019	2150000	t	2026-11-04 08:43:43.87947+00
41	148	Mother	Sunita	Nair	Professor	+91-9819208823	mother.mahek@example.com	567812343019	1610000	f	2026-11-04 08:43:43.87947+00
42	149	Father	Rajendra	Iyer	Civil Architect	+91-9819218822	father.johan@example.com	567812342020	2200000	t	2026-11-04 08:43:43.87947+00
43	149	Mother	Sunita	Iyer	Government Officer	+91-9819218823	mother.johan@example.com	567812343020	1650000	f	2026-11-04 08:43:43.87947+00
44	150	Father	Rajendra	Rao	Professor	+91-9819228822	father.avner@example.com	567812342021	2250000	t	2026-11-04 08:43:43.87947+00
45	150	Mother	Sunita	Rao	Commercial Banker	+91-9819228823	mother.avner@example.com	567812343021	1690000	f	2026-11-04 08:43:43.87947+00
46	151	Father	Rajendra	Shetty	Government Officer	+91-9819238822	father.apika@example.com	567812342022	2300000	t	2026-11-04 08:43:43.87947+00
47	151	Mother	Sunita	Shetty	Software Engineer	+91-9819238823	mother.apika@example.com	567812343022	1730000	f	2026-11-04 08:43:43.87947+00
48	152	Father	Rajendra	Kamath	Commercial Banker	+91-9819248822	father.shrawya@example.com	567812342023	2350000	t	2026-11-04 08:43:43.87947+00
49	152	Mother	Sunita	Kamath	Business Executive	+91-9819248823	mother.shrawya@example.com	567812343023	1770000	f	2026-11-04 08:43:43.87947+00
50	153	Father	Rajendra	Sharma	Software Engineer	+91-9819258822	father.afton@example.com	567812342024	2400000	t	2026-11-04 08:43:43.87947+00
51	153	Mother	Sunita	Sharma	Chartered Accountant	+91-9819258823	mother.afton@example.com	567812343024	1810000	f	2026-11-04 08:43:43.87947+00
52	154	Father	Rajendra	Verma	Business Executive	+91-9819268822	father.maahi@example.com	567812342025	2450000	t	2026-11-04 08:43:43.87947+00
53	154	Mother	Sunita	Verma	Doctor	+91-9819268823	mother.maahi@example.com	567812343025	1850000	f	2026-11-04 08:43:43.87947+00
54	155	Father	Rajendra	Patil	Chartered Accountant	+91-9819278822	father.aadya@example.com	567812342026	2500000	t	2026-11-04 08:43:43.87947+00
55	155	Mother	Sunita	Patil	Civil Architect	+91-9819278823	mother.aadya@example.com	567812343026	1890000	f	2026-11-04 08:43:43.87947+00
56	156	Father	Rajendra	Deshmukh	Doctor	+91-9819288822	father.rida@example.com	567812342027	2550000	t	2026-11-04 08:43:43.87947+00
57	156	Mother	Sunita	Deshmukh	Professor	+91-9819288823	mother.rida@example.com	567812343027	1930000	f	2026-11-04 08:43:43.87947+00
58	157	Father	Rajendra	Kulkarni	Civil Architect	+91-9819298822	father.puneeta@example.com	567812342028	2600000	t	2026-11-04 08:43:43.87947+00
59	157	Mother	Sunita	Kulkarni	Government Officer	+91-9819298823	mother.puneeta@example.com	567812343028	1970000	f	2026-11-04 08:43:43.87947+00
60	158	Father	Rajendra	Joshi	Professor	+91-9819308822	father.aliya@example.com	567812342029	2650000	t	2026-11-04 08:43:43.87947+00
61	158	Mother	Sunita	Joshi	Commercial Banker	+91-9819308823	mother.aliya@example.com	567812343029	2010000	f	2026-11-04 08:43:43.87947+00
62	159	Father	Rajendra	Mehta	Government Officer	+91-9819318822	father.siddhant@example.com	567812342030	2700000	t	2026-11-04 08:43:43.87947+00
63	159	Mother	Sunita	Mehta	Software Engineer	+91-9819318823	mother.siddhant@example.com	567812343030	2050000	f	2026-11-04 08:43:43.87947+00
64	160	Father	Rajendra	Shah	Commercial Banker	+91-9819328822	father.shaurya@example.com	567812342031	2750000	t	2026-11-04 08:43:43.87947+00
65	160	Mother	Sunita	Shah	Business Executive	+91-9819328823	mother.shaurya@example.com	567812343031	2090000	f	2026-11-04 08:43:43.87947+00
66	161	Father	Rajendra	Pawar	Software Engineer	+91-9819338822	father.chehek@example.com	567812342032	2800000	t	2026-11-04 08:43:43.87947+00
67	161	Mother	Sunita	Pawar	Chartered Accountant	+91-9819338823	mother.chehek@example.com	567812343032	2130000	f	2026-11-04 08:43:43.87947+00
68	162	Father	Rajendra	Bhide	Business Executive	+91-9819348822	father.siddharth@example.com	567812342033	2850000	t	2026-11-04 08:43:43.87947+00
69	162	Mother	Sunita	Bhide	Doctor	+91-9819348823	mother.siddharth@example.com	567812343033	2170000	f	2026-11-04 08:43:43.87947+00
70	163	Father	Rajendra	Chavan	Chartered Accountant	+91-9819358822	father.aditya@example.com	567812342034	2900000	t	2026-11-04 08:43:43.87947+00
71	163	Mother	Sunita	Chavan	Civil Architect	+91-9819358823	mother.aditya@example.com	567812343034	2210000	f	2026-11-04 08:43:43.87947+00
72	164	Father	Rajendra	Tambe	Doctor	+91-9819368822	father.shriya@example.com	567812342035	2950000	t	2026-11-04 08:43:43.87947+00
73	164	Mother	Sunita	Tambe	Professor	+91-9819368823	mother.shriya@example.com	567812343035	2250000	f	2026-11-04 08:43:43.87947+00
74	165	Father	Rajendra	Mistry	Civil Architect	+91-9819378822	father.sukhmeet@example.com	567812342036	3000000	t	2026-11-04 08:43:43.87947+00
75	165	Mother	Sunita	Mistry	Government Officer	+91-9819378823	mother.sukhmeet@example.com	567812343036	2290000	f	2026-11-04 08:43:43.87947+00
76	166	Father	Rajendra	Bhatia	Professor	+91-9819388822	father.sushmya@example.com	567812342037	3050000	t	2026-11-04 08:43:43.87947+00
77	166	Mother	Sunita	Bhatia	Commercial Banker	+91-9819388823	mother.sushmya@example.com	567812343037	2330000	f	2026-11-04 08:43:43.87947+00
78	167	Father	Rajendra	Kapoor	Government Officer	+91-9819398822	father.aaradhya@example.com	567812342038	3100000	t	2026-11-04 08:43:43.87947+00
79	167	Mother	Sunita	Kapoor	Software Engineer	+91-9819398823	mother.aaradhya@example.com	567812343038	2370000	f	2026-11-04 08:43:43.87947+00
\.


--
-- Data for Name: institutions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.institutions (id, name, code, address, city, state, pincode, phone, email, website, logo_url, is_active, created_at, updated_at) FROM stdin;
2	Prashant Academy	PA001	123 Education Lane, School District	Mumbai	Maharashtra	400001	+91-22-12345678	info@prashantacademy.edu.in	https://prashantacademy.edu.in	\N	t	2026-11-03 15:17:26.3504+00	2026-11-03 15:17:26.3504+00
\.


--
-- Data for Name: payment_allocations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payment_allocations (id, payment_id, invoice_id, installment_id, allocated_amount, created_at) FROM stdin;
1	1	31	\N	8500.00	2026-11-04 11:14:22.322779+00
2	2	8	\N	7000.00	2026-11-04 11:14:22.322779+00
3	3	30	\N	8500.00	2026-11-04 11:14:22.322779+00
4	4	7	\N	15000.00	2026-11-04 11:14:22.322779+00
5	5	11	\N	15000.00	2026-11-04 11:14:22.322779+00
6	6	31	\N	8500.00	2026-11-04 11:14:22.322779+00
7	7	27	\N	15000.00	2026-11-04 11:14:22.322779+00
8	8	14	\N	15000.00	2026-11-04 11:14:22.322779+00
9	9	26	\N	8500.00	2026-11-04 11:14:22.322779+00
10	10	32	\N	8000.00	2026-11-04 11:14:22.322779+00
11	11	5	\N	9500.00	2026-11-04 11:14:22.322779+00
12	12	4	\N	8500.00	2026-11-04 11:14:22.322779+00
13	13	8	\N	7000.00	2026-11-04 11:14:22.322779+00
14	14	15	\N	5000.00	2026-11-04 11:14:22.322779+00
15	15	13	\N	15000.00	2026-11-04 11:14:22.322779+00
16	16	25	\N	8500.00	2026-11-04 11:14:22.322779+00
17	17	9	\N	19000.00	2026-11-04 11:14:22.322779+00
18	18	10	\N	8500.00	2026-11-04 11:14:22.322779+00
19	19	17	\N	6000.00	2026-11-04 11:14:22.322779+00
20	20	19	\N	9735.00	2026-11-04 11:14:22.322779+00
21	21	33	\N	10000.00	2026-11-04 11:14:22.322779+00
22	22	6	\N	9500.00	2026-11-04 11:14:22.322779+00
23	23	34	\N	7500.00	2026-11-04 11:14:22.322779+00
24	24	16	\N	10000.00	2026-11-04 11:14:22.322779+00
25	25	7	\N	10000.00	2026-11-04 11:14:22.322779+00
26	26	31	\N	8500.00	2026-11-04 11:14:22.322779+00
27	27	24	\N	8000.00	2026-11-04 11:14:22.322779+00
28	28	9	\N	9500.00	2026-11-04 11:14:22.322779+00
29	29	14	\N	10000.00	2026-11-04 11:14:22.322779+00
30	30	4	\N	8500.00	2026-11-04 11:14:22.322779+00
31	31	3	\N	8000.00	2026-11-04 11:14:22.322779+00
32	32	10	\N	8500.00	2026-11-04 11:14:22.322779+00
33	33	26	\N	8500.00	2026-11-04 11:14:22.322779+00
34	34	5	\N	9500.00	2026-11-04 11:14:22.322779+00
35	35	25	\N	8000.00	2026-11-04 11:14:22.322779+00
36	36	8	\N	7000.00	2026-11-04 11:14:22.322779+00
37	37	15	\N	7500.00	2026-11-04 11:14:22.322779+00
38	38	32	\N	8000.00	2026-11-04 11:14:22.322779+00
39	39	34	\N	7500.00	2026-11-04 11:14:22.322779+00
40	40	20	\N	7500.00	2026-11-04 11:14:22.322779+00
41	41	30	\N	8500.00	2026-11-04 11:14:22.322779+00
42	42	18	\N	7500.00	2026-11-04 11:14:22.322779+00
43	43	6	\N	9500.00	2026-11-04 11:14:22.322779+00
44	44	11	\N	10000.00	2026-11-04 11:14:22.322779+00
45	45	33	\N	10000.00	2026-11-04 11:14:22.322779+00
46	46	27	\N	10000.00	2026-11-04 11:14:22.322779+00
47	47	14	\N	15000.00	2026-11-04 11:14:22.322779+00
48	48	7	\N	10000.00	2026-11-04 11:14:22.322779+00
49	49	16	\N	10000.00	2026-11-04 11:14:22.322779+00
50	50	4	\N	8500.00	2026-11-04 11:14:22.322779+00
51	51	19	\N	65265.00	2026-11-04 11:14:22.322779+00
52	52	31	\N	8500.00	2026-11-04 11:14:22.322779+00
53	53	30	\N	8500.00	2026-11-04 11:14:22.322779+00
54	54	34	\N	7500.00	2026-11-04 11:14:22.322779+00
55	55	3	\N	8000.00	2026-11-04 11:14:22.322779+00
56	56	17	\N	9000.00	2026-11-04 11:14:22.322779+00
57	57	8	\N	7000.00	2026-11-04 11:14:22.322779+00
58	58	5	\N	9500.00	2026-11-04 11:14:22.322779+00
59	59	22	\N	15000.00	2026-11-04 11:14:22.322779+00
60	60	9	\N	9500.00	2026-11-04 11:14:22.322779+00
61	61	15	\N	7500.00	2026-11-04 11:14:22.322779+00
62	62	20	\N	7500.00	2026-11-04 11:14:22.322779+00
63	63	21	\N	25000.00	2026-11-04 11:14:22.322779+00
64	64	23	\N	6000.00	2026-11-04 11:14:22.322779+00
65	65	6	\N	9500.00	2026-11-04 11:14:22.322779+00
66	66	13	\N	15000.00	2026-11-04 11:14:22.322779+00
67	67	28	\N	10000.00	2026-11-04 11:14:22.322779+00
68	68	32	\N	8000.00	2026-11-04 11:14:22.322779+00
69	69	29	\N	16400.00	2026-11-04 11:14:22.322779+00
70	70	11	\N	10000.00	2026-11-04 11:14:22.322779+00
71	71	26	\N	8500.00	2026-11-04 11:14:22.322779+00
72	72	18	\N	7500.00	2026-11-04 11:14:22.322779+00
73	73	33	\N	10000.00	2026-11-04 11:14:22.322779+00
74	74	27	\N	10000.00	2026-11-04 11:14:22.322779+00
75	75	7	\N	10000.00	2026-11-04 11:14:22.322779+00
76	76	20	\N	7500.00	2026-11-04 11:14:22.322779+00
77	77	14	\N	15000.00	2026-11-04 11:14:22.322779+00
78	78	9	\N	9500.00	2026-11-04 11:14:22.322779+00
79	79	4	\N	8500.00	2026-11-04 11:14:22.322779+00
80	80	28	\N	11000.00	2026-11-04 11:14:22.322779+00
81	81	31	\N	8500.00	2026-11-04 11:14:22.322779+00
82	82	3	\N	8000.00	2026-11-04 11:14:22.322779+00
83	83	29	\N	8500.00	2026-11-04 11:14:22.322779+00
84	84	30	\N	8500.00	2026-11-04 11:14:22.322779+00
85	85	2	\N	10000.00	2026-11-04 11:14:22.322779+00
86	86	35	\N	12000.00	2026-11-04 11:14:22.322779+00
87	87	10	\N	8500.00	2026-11-04 11:14:22.322779+00
88	88	5	\N	9500.00	2026-11-04 11:14:22.322779+00
89	89	8	\N	4000.00	2026-11-04 11:14:22.322779+00
90	90	23	\N	6000.00	2026-11-04 11:14:22.322779+00
91	91	17	\N	7000.00	2026-11-04 11:14:22.322779+00
92	92	15	\N	7500.00	2026-11-04 11:14:22.322779+00
93	93	18	\N	7500.00	2026-11-04 11:14:22.322779+00
94	94	26	\N	8500.00	2026-11-04 11:14:22.322779+00
95	95	24	\N	8000.00	2026-11-04 11:14:22.322779+00
96	96	32	\N	8000.00	2026-11-04 11:14:22.322779+00
97	97	27	\N	10000.00	2026-11-04 11:14:22.322779+00
98	98	6	\N	9500.00	2026-11-04 11:14:22.322779+00
99	99	9	\N	9500.00	2026-11-04 11:14:22.322779+00
100	100	36	\N	50000.00	2026-11-04 11:14:22.322779+00
101	101	14	\N	15000.00	2026-11-04 11:14:22.322779+00
102	102	7	\N	10000.00	2026-11-04 11:14:22.322779+00
103	103	25	\N	23000.00	2026-11-04 11:14:22.322779+00
104	104	31	\N	8600.00	2026-11-04 11:14:22.322779+00
105	105	4	\N	8500.00	2026-11-04 11:14:22.322779+00
106	106	16	\N	10000.00	2026-11-04 11:14:22.322779+00
107	107	16	\N	10000.00	2026-11-04 11:14:22.322779+00
108	108	34	\N	7500.00	2026-11-04 11:14:22.322779+00
109	109	33	\N	10000.00	2026-11-04 11:14:22.322779+00
110	110	5	\N	9500.00	2026-11-04 11:14:22.322779+00
111	111	3	\N	8000.00	2026-11-04 11:14:22.322779+00
112	112	10	\N	8500.00	2026-11-04 11:14:22.322779+00
113	113	32	\N	8000.00	2026-11-04 11:14:22.322779+00
114	114	23	\N	6000.00	2026-11-04 11:14:22.322779+00
115	115	15	\N	7500.00	2026-11-04 11:14:22.322779+00
116	116	20	\N	7500.00	2026-11-04 11:14:22.322779+00
117	117	17	\N	7000.00	2026-11-04 11:14:22.322779+00
118	118	8	\N	5000.00	2026-11-04 11:14:22.322779+00
119	119	24	\N	6000.00	2026-11-04 11:14:22.322779+00
120	120	18	\N	7500.00	2026-11-04 11:14:22.322779+00
121	121	27	\N	10000.00	2026-11-04 11:14:22.322779+00
122	122	26	\N	8100.00	2026-11-04 11:14:22.322779+00
123	123	14	\N	10000.00	2026-11-04 11:14:22.322779+00
124	124	6	\N	9500.00	2026-11-04 11:14:22.322779+00
125	125	7	\N	10000.00	2026-11-04 11:14:22.322779+00
126	126	35	\N	15000.00	2026-11-04 11:14:22.322779+00
127	127	32	\N	8000.00	2026-11-04 11:14:22.322779+00
128	128	26	\N	8500.00	2026-11-04 11:14:22.322779+00
129	129	2	\N	10000.00	2026-11-04 11:14:22.322779+00
130	130	4	\N	8500.00	2026-11-04 11:14:22.322779+00
131	131	31	\N	8500.00	2026-11-04 11:14:22.322779+00
132	132	5	\N	9500.00	2026-11-04 11:14:22.322779+00
133	133	13	\N	15000.00	2026-11-04 11:14:22.322779+00
134	134	9	\N	9500.00	2026-11-04 11:14:22.322779+00
135	135	15	\N	7700.00	2026-11-04 11:14:22.322779+00
136	136	23	\N	6000.00	2026-11-04 11:14:22.322779+00
137	137	3	\N	8000.00	2026-11-04 11:14:22.322779+00
138	138	10	\N	8500.00	2026-11-04 11:14:22.322779+00
139	139	17	\N	7000.00	2026-11-04 11:14:22.322779+00
140	140	25	\N	10000.00	2026-11-04 11:14:22.322779+00
141	141	27	\N	10000.00	2026-11-04 11:14:22.322779+00
142	142	9	\N	9500.00	2026-11-04 11:14:22.322779+00
143	143	35	\N	58000.00	2026-11-04 11:14:22.322779+00
144	144	17	\N	7000.00	2026-11-04 11:14:22.322779+00
145	145	28	\N	20000.00	2026-11-04 11:14:22.322779+00
146	146	31	\N	8500.00	2026-11-04 11:14:22.322779+00
147	147	4	\N	8500.00	2026-11-04 11:14:22.322779+00
148	148	32	\N	8000.00	2026-11-04 11:14:22.322779+00
149	149	8	\N	8000.00	2026-11-04 11:14:22.322779+00
150	150	5	\N	9500.00	2026-11-04 11:14:22.322779+00
151	151	23	\N	6000.00	2026-11-04 11:14:22.322779+00
152	152	3	\N	8000.00	2026-11-04 11:14:22.322779+00
153	153	15	\N	7500.00	2026-11-04 11:14:22.322779+00
154	154	20	\N	15000.00	2026-11-04 11:14:22.322779+00
155	155	18	\N	15000.00	2026-11-04 11:14:22.322779+00
156	156	1	\N	15000.00	2026-11-04 11:14:22.322779+00
157	157	27	\N	10000.00	2026-11-04 11:14:22.322779+00
158	158	25	\N	10000.00	2026-11-04 11:14:22.322779+00
159	159	22	\N	10000.00	2026-11-04 11:14:22.322779+00
160	160	33	\N	10000.00	2026-11-04 11:14:22.322779+00
161	161	10	\N	8500.00	2026-11-04 11:14:22.322779+00
162	162	6	\N	9500.00	2026-11-04 11:14:22.322779+00
163	163	16	\N	10000.00	2026-11-04 11:14:22.322779+00
164	164	4	\N	8500.00	2026-11-04 11:14:22.322779+00
165	165	6	\N	9500.00	2026-11-04 11:14:22.322779+00
166	166	9	\N	9700.00	2026-11-04 11:14:22.322779+00
167	167	17	\N	7000.00	2026-11-04 11:14:22.322779+00
168	168	12	\N	55000.00	2026-11-04 11:14:22.322779+00
169	169	15	\N	7500.00	2026-11-04 11:14:22.322779+00
170	170	21	\N	25000.00	2026-11-04 11:14:22.322779+00
\.


--
-- Data for Name: payment_receipts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payment_receipts (id, receipt_number, payment_id, student_id, amount, payment_date, payment_method, receipt_data, generated_at) FROM stdin;
1	RCP-2026-0001	1	149	8500.00	2026-03-06	bank_transfer	{"receipt_number": "RCP-2026-0001", "student_name": "Johan Iyer", "admission_number": "PA-2024-000021", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "06-Mar-2026", "raw_date": "06-Mar-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0001", "amount": 8500.0, "invoice_number": "INV-2026-0149", "notes": "Payment #1 for Johan (Padata.xlsx row 2)"}	2026-11-04 11:14:22.322779+00
2	RCP-2026-0002	2	132	7000.00	2026-03-09	bank_transfer	{"receipt_number": "RCP-2026-0002", "student_name": "Shreshta Deshmukh", "admission_number": "PA-2024-000004", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "09-Mar-2026", "raw_date": "09-Mar-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0002", "amount": 7000.0, "invoice_number": "INV-2026-0132", "notes": "Payment #2 for Shreshta (Padata.xlsx row 3)"}	2026-11-04 11:14:22.322779+00
3	RCP-2026-0003	3	148	8500.00	2026-03-24	upi	{"receipt_number": "RCP-2026-0003", "student_name": "Mahek Nair", "admission_number": "PA-2024-000020", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "24-Mar-2026", "raw_date": "24-Mar-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0003", "amount": 8500.0, "invoice_number": "INV-2026-0148", "notes": "Payment #3 for Mahek (Padata.xlsx row 4)"}	2026-11-04 11:14:22.322779+00
4	RCP-2026-0004	4	131	15000.00	2026-04-02	bank_transfer	{"receipt_number": "RCP-2026-0004", "student_name": "Netham Patil", "admission_number": "PA-2024-000003", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "02-Apr-2026", "raw_date": "02-Apr-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0004", "amount": 15000.0, "invoice_number": "INV-2026-0131", "notes": "Payment #4 for Netham (Padata.xlsx row 5)"}	2026-11-04 11:14:22.322779+00
5	RCP-2026-0005	5	135	15000.00	2026-04-03	bank_transfer	{"receipt_number": "RCP-2026-0005", "student_name": "Riddhima Mehta", "admission_number": "PA-2024-000007", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "03-Apr-2026", "raw_date": "03-Apr-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0005", "amount": 15000.0, "invoice_number": "INV-2026-0135", "notes": "Payment #5 for Riddhima (Padata.xlsx row 6)"}	2026-11-04 11:14:22.322779+00
6	RCP-2026-0006	6	149	8500.00	2026-04-04	upi	{"receipt_number": "RCP-2026-0006", "student_name": "Johan Iyer", "admission_number": "PA-2024-000021", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "04-Apr-2026", "raw_date": "04-Apr-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0006", "amount": 8500.0, "invoice_number": "INV-2026-0149", "notes": "Payment #6 for Johan (Padata.xlsx row 7)"}	2026-11-04 11:14:22.322779+00
7	RCP-2026-0007	7	145	15000.00	2026-04-04	cash	{"receipt_number": "RCP-2026-0007", "student_name": "Kashish Sawant", "admission_number": "PA-2024-000017", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "04-Apr-2026", "raw_date": "04-Apr-2026", "payment_method": "cash", "transaction_reference": "TXN-2026-0007", "amount": 15000.0, "invoice_number": "INV-2026-0145", "notes": "Payment #7 for Kashish (Padata.xlsx row 8)"}	2026-11-04 11:14:22.322779+00
8	RCP-2026-0008	8	139	15000.00	2026-04-06	bank_transfer	{"receipt_number": "RCP-2026-0008", "student_name": "Aman Chavan", "admission_number": "PA-2024-000011", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "06-Apr-2026", "raw_date": "06-Apr-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0008", "amount": 15000.0, "invoice_number": "INV-2026-0139", "notes": "Payment #8 for Aman (Padata.xlsx row 9)"}	2026-11-04 11:14:22.322779+00
9	RCP-2026-0009	9	144	8500.00	2026-04-08	upi	{"receipt_number": "RCP-2026-0009", "student_name": "Simran Malhotra", "admission_number": "PA-2024-000016", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "08-Apr-2026", "raw_date": "08-Apr-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0009", "amount": 8500.0, "invoice_number": "INV-2026-0144", "notes": "Payment #9 for Simran (Padata.xlsx row 10)"}	2026-11-04 11:14:22.322779+00
10	RCP-2026-0010	10	150	8000.00	2026-04-09	bank_transfer	{"receipt_number": "RCP-2026-0010", "student_name": "Avner Rao", "admission_number": "PA-2024-000022", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "09-Apr-2026", "raw_date": "09-Apr-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0010", "amount": 8000.0, "invoice_number": "INV-2026-0150", "notes": "Payment #10 for Avner (Padata.xlsx row 11)"}	2026-11-04 11:14:22.322779+00
11	RCP-2026-0011	11	129	9500.00	2026-04-09	bank_transfer	{"receipt_number": "RCP-2026-0011", "student_name": "Rajnees Sharma", "admission_number": "PA-2024-000001", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "09-Apr-2026", "raw_date": "09-Apr-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0011", "amount": 9500.0, "invoice_number": "INV-2026-0129", "notes": "Payment #11 for Rajnees (Padata.xlsx row 12)"}	2026-11-04 11:14:22.322779+00
12	RCP-2026-0012	12	137	8500.00	2026-04-09	upi	{"receipt_number": "RCP-2026-0012", "student_name": "Raudrita Pawar", "admission_number": "PA-2024-000009", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "09-Apr-2026", "raw_date": "09-Apr-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0012", "amount": 8500.0, "invoice_number": "INV-2026-0137", "notes": "Payment #12 for Raudrita (Padata.xlsx row 13)"}	2026-11-04 11:14:22.322779+00
13	RCP-2026-0013	13	132	7000.00	2026-04-09	bank_transfer	{"receipt_number": "RCP-2026-0013", "student_name": "Shreshta Deshmukh", "admission_number": "PA-2024-000004", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "09-Apr-2026", "raw_date": "09-Apr-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0013", "amount": 7000.0, "invoice_number": "INV-2026-0132", "notes": "Payment #13 for Shreshta (Padata.xlsx row 14)"}	2026-11-04 11:14:22.322779+00
14	RCP-2026-0014	14	140	5000.00	2026-04-10	cash	{"receipt_number": "RCP-2026-0014", "student_name": "Ashwin Tambe", "admission_number": "PA-2024-000012", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "10-Apr-2026", "raw_date": "10-Apr-2026", "payment_method": "cash", "transaction_reference": "TXN-2026-0014", "amount": 5000.0, "invoice_number": "INV-2026-0140", "notes": "Payment #14 for Ashwin (Padata.xlsx row 15)"}	2026-11-04 11:14:22.322779+00
15	RCP-2026-0015	15	138	15000.00	2026-04-11	bank_transfer	{"receipt_number": "RCP-2026-0015", "student_name": "Samruddhi Bhide", "admission_number": "PA-2024-000010", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "11-Apr-2026", "raw_date": "11-Apr-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0015", "amount": 15000.0, "invoice_number": "INV-2026-0138", "notes": "Payment #15 for Samruddhi (Padata.xlsx row 16)"}	2026-11-04 11:14:22.322779+00
16	RCP-2026-0016	16	143	8500.00	2026-04-11	bank_transfer	{"receipt_number": "RCP-2026-0016", "student_name": "Samud Kapoor", "admission_number": "PA-2024-000015", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "11-Apr-2026", "raw_date": "11-Apr-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0016", "amount": 8500.0, "invoice_number": "INV-2026-0143", "notes": "Payment #16 for Samud (Padata.xlsx row 17)"}	2026-11-04 11:14:22.322779+00
17	RCP-2026-0017	17	133	19000.00	2026-04-12	bank_transfer	{"receipt_number": "RCP-2026-0017", "student_name": "Savesh Kulkarni", "admission_number": "PA-2024-000005", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "12-Apr-2026", "raw_date": "12-Apr-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0017", "amount": 19000.0, "invoice_number": "INV-2026-0133", "notes": "Payment #17 for Savesh (Padata.xlsx row 18)"}	2026-11-04 11:14:22.322779+00
18	RCP-2026-0018	18	134	8500.00	2026-04-13	upi	{"receipt_number": "RCP-2026-0018", "student_name": "Ansh Joshi", "admission_number": "PA-2024-000006", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "13-Apr-2026", "raw_date": "13-Apr-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0018", "amount": 8500.0, "invoice_number": "INV-2026-0134", "notes": "Payment #18 for Ansh (Padata.xlsx row 19)"}	2026-11-04 11:14:22.322779+00
19	RCP-2026-0019	19	157	6000.00	2026-04-14	cheque	{"receipt_number": "RCP-2026-0019", "student_name": "Puneeta Kulkarni", "admission_number": "PA-2024-000029", "standard": "Class VIII", "batch": "Batch A (Morning)", "payment_date": "14-Apr-2026", "raw_date": "14-Apr-2026", "payment_method": "cheque", "transaction_reference": "TXN-2026-0019", "amount": 6000.0, "invoice_number": "INV-2026-0157", "notes": "Payment #19 for Puneeta (Padata.xlsx row 20)"}	2026-11-04 11:14:22.322779+00
20	RCP-2026-0020	20	159	9735.00	2026-04-14	bank_transfer	{"receipt_number": "RCP-2026-0020", "student_name": "Siddhant Mehta", "admission_number": "PA-2024-000031", "standard": "Class VIII", "batch": "Batch A (Morning)", "payment_date": "14-Apr-2026", "raw_date": "14-Apr-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0020", "amount": 9735.0, "invoice_number": "INV-2026-0159", "notes": "Payment #20 for Siddhant (Padata.xlsx row 21)"}	2026-11-04 11:14:22.322779+00
21	RCP-2026-0021	21	151	10000.00	2026-04-16	upi	{"receipt_number": "RCP-2026-0021", "student_name": "Apika Shetty", "admission_number": "PA-2024-000023", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "16-Apr-2026", "raw_date": "16-Apr-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0021", "amount": 10000.0, "invoice_number": "INV-2026-0151", "notes": "Payment #21 for Apika (Padata.xlsx row 22)"}	2026-11-04 11:14:22.322779+00
22	RCP-2026-0022	22	130	9500.00	2026-04-17	bank_transfer	{"receipt_number": "RCP-2026-0022", "student_name": "Ayaan Verma", "admission_number": "PA-2024-000002", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "17-Apr-2026", "raw_date": "17-Apr-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0022", "amount": 9500.0, "invoice_number": "INV-2026-0130", "notes": "Payment #22 for Ayaan (Padata.xlsx row 23)"}	2026-11-04 11:14:22.322779+00
23	RCP-2026-0023	23	152	7500.00	2026-04-18	bank_transfer	{"receipt_number": "RCP-2026-0023", "student_name": "Shrawya Kamath", "admission_number": "PA-2024-000024", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "18-Apr-2026", "raw_date": "18-Apr-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0023", "amount": 7500.0, "invoice_number": "INV-2026-0152", "notes": "Payment #23 for Shrawya (Padata.xlsx row 24)"}	2026-11-04 11:14:22.322779+00
24	RCP-2026-0024	24	141	10000.00	2026-04-26	upi	{"receipt_number": "RCP-2026-0024", "student_name": "Keshwa Mistry", "admission_number": "PA-2024-000013", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "26-Apr-2026", "raw_date": "26-Apr-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0024", "amount": 10000.0, "invoice_number": "INV-2026-0141", "notes": "Payment #24 for Keshwa (Padata.xlsx row 25)"}	2026-11-04 11:14:22.322779+00
25	RCP-2026-0025	25	131	10000.00	2026-05-03	bank_transfer	{"receipt_number": "RCP-2026-0025", "student_name": "Netham Patil", "admission_number": "PA-2024-000003", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "03-May-2026", "raw_date": "03-May-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0025", "amount": 10000.0, "invoice_number": "INV-2026-0131", "notes": "Payment #25 for Netham (Padata.xlsx row 26)"}	2026-11-04 11:14:22.322779+00
26	RCP-2026-0026	26	149	8500.00	2026-05-04	bank_transfer	{"receipt_number": "RCP-2026-0026", "student_name": "Johan Iyer", "admission_number": "PA-2024-000021", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "04-May-2026", "raw_date": "04-May-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0026", "amount": 8500.0, "invoice_number": "INV-2026-0149", "notes": "Payment #26 for Johan (Padata.xlsx row 27)"}	2026-11-04 11:14:22.322779+00
27	RCP-2026-0027	27	142	8000.00	2026-05-06	upi	{"receipt_number": "RCP-2026-0027", "student_name": "Satnam Bhatia", "admission_number": "PA-2024-000014", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "06-May-2026", "raw_date": "06-May-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0027", "amount": 8000.0, "invoice_number": "INV-2026-0142", "notes": "Payment #27 for Satnam (Padata.xlsx row 28)"}	2026-11-04 11:14:22.322779+00
28	RCP-2026-0028	28	133	9500.00	2026-05-06	cash	{"receipt_number": "RCP-2026-0028", "student_name": "Savesh Kulkarni", "admission_number": "PA-2024-000005", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "06-May-2026", "raw_date": "06-May-2026", "payment_method": "cash", "transaction_reference": "TXN-2026-0028", "amount": 9500.0, "invoice_number": "INV-2026-0133", "notes": "Payment #28 for Savesh (Padata.xlsx row 29)"}	2026-11-04 11:14:22.322779+00
29	RCP-2026-0029	29	139	10000.00	2026-05-07	bank_transfer	{"receipt_number": "RCP-2026-0029", "student_name": "Aman Chavan", "admission_number": "PA-2024-000011", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "07-May-2026", "raw_date": "07-May-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0029", "amount": 10000.0, "invoice_number": "INV-2026-0139", "notes": "Payment #29 for Aman (Padata.xlsx row 30)"}	2026-11-04 11:14:22.322779+00
30	RCP-2026-0030	30	137	8500.00	2026-05-07	upi	{"receipt_number": "RCP-2026-0030", "student_name": "Raudrita Pawar", "admission_number": "PA-2024-000009", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "07-May-2026", "raw_date": "07-May-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0030", "amount": 8500.0, "invoice_number": "INV-2026-0137", "notes": "Payment #30 for Raudrita (Padata.xlsx row 31)"}	2026-11-04 11:14:22.322779+00
31	RCP-2026-0031	31	155	8000.00	2026-05-08	bank_transfer	{"receipt_number": "RCP-2026-0031", "student_name": "Aadya Patil", "admission_number": "PA-2024-000027", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "08-May-2026", "raw_date": "08-May-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0031", "amount": 8000.0, "invoice_number": "INV-2026-0155", "notes": "Payment #31 for Aadya (Padata.xlsx row 32)"}	2026-11-04 11:14:22.322779+00
32	RCP-2026-0032	32	134	8500.00	2026-05-08	bank_transfer	{"receipt_number": "RCP-2026-0032", "student_name": "Ansh Joshi", "admission_number": "PA-2024-000006", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "08-May-2026", "raw_date": "08-May-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0032", "amount": 8500.0, "invoice_number": "INV-2026-0134", "notes": "Payment #32 for Ansh (Padata.xlsx row 33)"}	2026-11-04 11:14:22.322779+00
33	RCP-2026-0033	33	144	8500.00	2026-05-08	upi	{"receipt_number": "RCP-2026-0033", "student_name": "Simran Malhotra", "admission_number": "PA-2024-000016", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "08-May-2026", "raw_date": "08-May-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0033", "amount": 8500.0, "invoice_number": "INV-2026-0144", "notes": "Payment #33 for Simran (Padata.xlsx row 34)"}	2026-11-04 11:14:22.322779+00
34	RCP-2026-0034	34	129	9500.00	2026-05-09	bank_transfer	{"receipt_number": "RCP-2026-0034", "student_name": "Rajnees Sharma", "admission_number": "PA-2024-000001", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "09-May-2026", "raw_date": "09-May-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0034", "amount": 9500.0, "invoice_number": "INV-2026-0129", "notes": "Payment #34 for Rajnees (Padata.xlsx row 35)"}	2026-11-04 11:14:22.322779+00
35	RCP-2026-0035	35	143	8000.00	2026-05-09	cash	{"receipt_number": "RCP-2026-0035", "student_name": "Samud Kapoor", "admission_number": "PA-2024-000015", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "09-May-2026", "raw_date": "09-May-2026", "payment_method": "cash", "transaction_reference": "TXN-2026-0035", "amount": 8000.0, "invoice_number": "INV-2026-0143", "notes": "Payment #35 for Samud (Padata.xlsx row 36)"}	2026-11-04 11:14:22.322779+00
36	RCP-2026-0036	36	132	7000.00	2026-05-09	upi	{"receipt_number": "RCP-2026-0036", "student_name": "Shreshta Deshmukh", "admission_number": "PA-2024-000004", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "09-May-2026", "raw_date": "09-May-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0036", "amount": 7000.0, "invoice_number": "INV-2026-0132", "notes": "Payment #36 for Shreshta (Padata.xlsx row 37)"}	2026-11-04 11:14:22.322779+00
37	RCP-2026-0037	37	140	7500.00	2026-05-10	bank_transfer	{"receipt_number": "RCP-2026-0037", "student_name": "Ashwin Tambe", "admission_number": "PA-2024-000012", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "10-May-2026", "raw_date": "10-May-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0037", "amount": 7500.0, "invoice_number": "INV-2026-0140", "notes": "Payment #37 for Ashwin (Padata.xlsx row 38)"}	2026-11-04 11:14:22.322779+00
38	RCP-2026-0038	38	150	8000.00	2026-05-10	cheque	{"receipt_number": "RCP-2026-0038", "student_name": "Avner Rao", "admission_number": "PA-2024-000022", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "10-May-2026", "raw_date": "10-May-2026", "payment_method": "cheque", "transaction_reference": "TXN-2026-0038", "amount": 8000.0, "invoice_number": "INV-2026-0150", "notes": "Payment #38 for Avner (Padata.xlsx row 39)"}	2026-11-04 11:14:22.322779+00
39	RCP-2026-0039	39	152	7500.00	2026-05-10	upi	{"receipt_number": "RCP-2026-0039", "student_name": "Shrawya Kamath", "admission_number": "PA-2024-000024", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "10-May-2026", "raw_date": "10-May-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0039", "amount": 7500.0, "invoice_number": "INV-2026-0152", "notes": "Payment #39 for Shrawya (Padata.xlsx row 40)"}	2026-11-04 11:14:22.322779+00
40	RCP-2026-0040	40	161	7500.00	2026-05-11	bank_transfer	{"receipt_number": "RCP-2026-0040", "student_name": "Chehek Pawar", "admission_number": "PA-2024-000033", "standard": "Class VIII", "batch": "Batch A (Morning)", "payment_date": "11-May-2026", "raw_date": "11-May-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0040", "amount": 7500.0, "invoice_number": "INV-2026-0161", "notes": "Payment #40 for Chehek (Padata.xlsx row 41)"}	2026-11-04 11:14:22.322779+00
41	RCP-2026-0041	41	148	8500.00	2026-05-11	bank_transfer	{"receipt_number": "RCP-2026-0041", "student_name": "Mahek Nair", "admission_number": "PA-2024-000020", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "11-May-2026", "raw_date": "11-May-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0041", "amount": 8500.0, "invoice_number": "INV-2026-0148", "notes": "Payment #41 for Mahek (Padata.xlsx row 42)"}	2026-11-04 11:14:22.322779+00
42	RCP-2026-0042	42	158	7500.00	2026-05-18	upi	{"receipt_number": "RCP-2026-0042", "student_name": "Aliya Joshi", "admission_number": "PA-2024-000030", "standard": "Class VIII", "batch": "Batch A (Morning)", "payment_date": "18-May-2026", "raw_date": "18-May-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0042", "amount": 7500.0, "invoice_number": "INV-2026-0158", "notes": "Payment #42 for Aliya (Padata.xlsx row 43)"}	2026-11-04 11:14:22.322779+00
43	RCP-2026-0043	43	130	9500.00	2026-05-18	bank_transfer	{"receipt_number": "RCP-2026-0043", "student_name": "Ayaan Verma", "admission_number": "PA-2024-000002", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "18-May-2026", "raw_date": "18-May-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0043", "amount": 9500.0, "invoice_number": "INV-2026-0130", "notes": "Payment #43 for Ayaan (Padata.xlsx row 44)"}	2026-11-04 11:14:22.322779+00
44	RCP-2026-0044	44	135	10000.00	2026-05-19	bank_transfer	{"receipt_number": "RCP-2026-0044", "student_name": "Riddhima Mehta", "admission_number": "PA-2024-000007", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "19-May-2026", "raw_date": "19-May-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0044", "amount": 10000.0, "invoice_number": "INV-2026-0135", "notes": "Payment #44 for Riddhima (Padata.xlsx row 45)"}	2026-11-04 11:14:22.322779+00
45	RCP-2026-0045	45	151	10000.00	2026-05-26	upi	{"receipt_number": "RCP-2026-0045", "student_name": "Apika Shetty", "admission_number": "PA-2024-000023", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "26-May-2026", "raw_date": "26-May-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0045", "amount": 10000.0, "invoice_number": "INV-2026-0151", "notes": "Payment #45 for Apika (Padata.xlsx row 46)"}	2026-11-04 11:14:22.322779+00
46	RCP-2026-0046	46	145	10000.00	2026-05-28	bank_transfer	{"receipt_number": "RCP-2026-0046", "student_name": "Kashish Sawant", "admission_number": "PA-2024-000017", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "28-May-2026", "raw_date": "28-May-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0046", "amount": 10000.0, "invoice_number": "INV-2026-0145", "notes": "Payment #46 for Kashish (Padata.xlsx row 47)"}	2026-11-04 11:14:22.322779+00
47	RCP-2026-0047	47	139	15000.00	2026-05-29	bank_transfer	{"receipt_number": "RCP-2026-0047", "student_name": "Aman Chavan", "admission_number": "PA-2024-000011", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "29-May-2026", "raw_date": "29-May-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0047", "amount": 15000.0, "invoice_number": "INV-2026-0139", "notes": "Payment #47 for Aman (Padata.xlsx row 48)"}	2026-11-04 11:14:22.322779+00
48	RCP-2026-0048	48	131	10000.00	2026-05-30	upi	{"receipt_number": "RCP-2026-0048", "student_name": "Netham Patil", "admission_number": "PA-2024-000003", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "30-May-2026", "raw_date": "30-May-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0048", "amount": 10000.0, "invoice_number": "INV-2026-0131", "notes": "Payment #48 for Netham (Padata.xlsx row 49)"}	2026-11-04 11:14:22.322779+00
49	RCP-2026-0049	49	141	10000.00	2026-06-01	cash	{"receipt_number": "RCP-2026-0049", "student_name": "Keshwa Mistry", "admission_number": "PA-2024-000013", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "01-Jun-2026", "raw_date": "01-Jun-2026", "payment_method": "cash", "transaction_reference": "TXN-2026-0049", "amount": 10000.0, "invoice_number": "INV-2026-0141", "notes": "Payment #49 for Keshwa (Padata.xlsx row 50)"}	2026-11-04 11:14:22.322779+00
50	RCP-2026-0050	50	137	8500.00	2026-06-03	bank_transfer	{"receipt_number": "RCP-2026-0050", "student_name": "Raudrita Pawar", "admission_number": "PA-2024-000009", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "03-Jun-2026", "raw_date": "03-Jun-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0050", "amount": 8500.0, "invoice_number": "INV-2026-0137", "notes": "Payment #50 for Raudrita (Padata.xlsx row 51)"}	2026-11-04 11:14:22.322779+00
51	RCP-2026-0051	51	159	65265.00	2026-06-03	bank_transfer	{"receipt_number": "RCP-2026-0051", "student_name": "Siddhant Mehta", "admission_number": "PA-2024-000031", "standard": "Class VIII", "batch": "Batch A (Morning)", "payment_date": "03-Jun-2026", "raw_date": "03-Jun-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0051", "amount": 65265.0, "invoice_number": "INV-2026-0159", "notes": "Payment #51 for Siddhant (Padata.xlsx row 52)"}	2026-11-04 11:14:22.322779+00
52	RCP-2026-0052	52	149	8500.00	2026-06-05	bank_transfer	{"receipt_number": "RCP-2026-0052", "student_name": "Johan Iyer", "admission_number": "PA-2024-000021", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "05-Jun-2026", "raw_date": "05-Jun-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0052", "amount": 8500.0, "invoice_number": "INV-2026-0149", "notes": "Payment #52 for Johan (Padata.xlsx row 53)"}	2026-11-04 11:14:22.322779+00
53	RCP-2026-0053	53	148	8500.00	2026-06-05	bank_transfer	{"receipt_number": "RCP-2026-0053", "student_name": "Mahek Nair", "admission_number": "PA-2024-000020", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "05-Jun-2026", "raw_date": "05-Jun-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0053", "amount": 8500.0, "invoice_number": "INV-2026-0148", "notes": "Payment #53 for Mahek (Padata.xlsx row 54)"}	2026-11-04 11:14:22.322779+00
54	RCP-2026-0054	54	152	7500.00	2026-06-05	upi	{"receipt_number": "RCP-2026-0054", "student_name": "Shrawya Kamath", "admission_number": "PA-2024-000024", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "05-Jun-2026", "raw_date": "05-Jun-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0054", "amount": 7500.0, "invoice_number": "INV-2026-0152", "notes": "Payment #54 for Shrawya (Padata.xlsx row 55)"}	2026-11-04 11:14:22.322779+00
55	RCP-2026-0055	55	155	8000.00	2026-06-07	bank_transfer	{"receipt_number": "RCP-2026-0055", "student_name": "Aadya Patil", "admission_number": "PA-2024-000027", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "07-Jun-2026", "raw_date": "07-Jun-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0055", "amount": 8000.0, "invoice_number": "INV-2026-0155", "notes": "Payment #55 for Aadya (Padata.xlsx row 56)"}	2026-11-04 11:14:22.322779+00
56	RCP-2026-0056	56	157	9000.00	2026-06-08	cash	{"receipt_number": "RCP-2026-0056", "student_name": "Puneeta Kulkarni", "admission_number": "PA-2024-000029", "standard": "Class VIII", "batch": "Batch A (Morning)", "payment_date": "08-Jun-2026", "raw_date": "08-Jun-2026", "payment_method": "cash", "transaction_reference": "TXN-2026-0056", "amount": 9000.0, "invoice_number": "INV-2026-0157", "notes": "Payment #56 for Puneeta (Padata.xlsx row 57)"}	2026-11-04 11:14:22.322779+00
57	RCP-2026-0057	57	132	7000.00	2026-06-08	upi	{"receipt_number": "RCP-2026-0057", "student_name": "Shreshta Deshmukh", "admission_number": "PA-2024-000004", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "08-Jun-2026", "raw_date": "08-Jun-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0057", "amount": 7000.0, "invoice_number": "INV-2026-0132", "notes": "Payment #57 for Shreshta (Padata.xlsx row 58)"}	2026-11-04 11:14:22.322779+00
58	RCP-2026-0058	58	129	9500.00	2026-06-09	bank_transfer	{"receipt_number": "RCP-2026-0058", "student_name": "Rajnees Sharma", "admission_number": "PA-2024-000001", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "09-Jun-2026", "raw_date": "09-Jun-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0058", "amount": 9500.0, "invoice_number": "INV-2026-0129", "notes": "Payment #58 for Rajnees (Padata.xlsx row 59)"}	2026-11-04 11:14:22.322779+00
59	RCP-2026-0059	59	164	15000.00	2026-06-09	bank_transfer	{"receipt_number": "RCP-2026-0059", "student_name": "Shriya Tambe", "admission_number": "PA-2024-000036", "standard": "Class IX", "batch": "Batch A (Morning)", "payment_date": "09-Jun-2026", "raw_date": "09-Jun-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0059", "amount": 15000.0, "invoice_number": "INV-2026-0164", "notes": "Payment #59 for Shriya (Padata.xlsx row 60)"}	2026-11-04 11:14:22.322779+00
60	RCP-2026-0060	60	133	9500.00	2026-06-10	upi	{"receipt_number": "RCP-2026-0060", "student_name": "Savesh Kulkarni", "admission_number": "PA-2024-000005", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "10-Jun-2026", "raw_date": "10-Jun-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0060", "amount": 9500.0, "invoice_number": "INV-2026-0133", "notes": "Payment #60 for Savesh (Padata.xlsx row 61)"}	2026-11-04 11:14:22.322779+00
61	RCP-2026-0061	61	140	7500.00	2026-06-11	bank_transfer	{"receipt_number": "RCP-2026-0061", "student_name": "Ashwin Tambe", "admission_number": "PA-2024-000012", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "11-Jun-2026", "raw_date": "11-Jun-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0061", "amount": 7500.0, "invoice_number": "INV-2026-0140", "notes": "Payment #61 for Ashwin (Padata.xlsx row 62)"}	2026-11-04 11:14:22.322779+00
62	RCP-2026-0062	62	161	7500.00	2026-06-11	bank_transfer	{"receipt_number": "RCP-2026-0062", "student_name": "Chehek Pawar", "admission_number": "PA-2024-000033", "standard": "Class VIII", "batch": "Batch A (Morning)", "payment_date": "11-Jun-2026", "raw_date": "11-Jun-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0062", "amount": 7500.0, "invoice_number": "INV-2026-0161", "notes": "Payment #62 for Chehek (Padata.xlsx row 63)"}	2026-11-04 11:14:22.322779+00
63	RCP-2026-0063	63	162	25000.00	2026-06-11	cash	{"receipt_number": "RCP-2026-0063", "student_name": "Siddharth Bhide", "admission_number": "PA-2024-000034", "standard": "Class IX", "batch": "Batch A (Morning)", "payment_date": "11-Jun-2026", "raw_date": "11-Jun-2026", "payment_method": "cash", "transaction_reference": "TXN-2026-0063", "amount": 25000.0, "invoice_number": "INV-2026-0162", "notes": "Payment #63 for Siddharth (Padata.xlsx row 64)"}	2026-11-04 11:14:22.322779+00
64	RCP-2026-0064	64	165	6000.00	2026-06-11	bank_transfer	{"receipt_number": "RCP-2026-0064", "student_name": "Sukhmeet Mistry", "admission_number": "PA-2024-000037", "standard": "Class IX", "batch": "Batch A (Morning)", "payment_date": "11-Jun-2026", "raw_date": "11-Jun-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0064", "amount": 6000.0, "invoice_number": "INV-2026-0165", "notes": "Payment #64 for Sukhmeet (Padata.xlsx row 65)"}	2026-11-04 11:14:22.322779+00
65	RCP-2026-0065	65	130	9500.00	2026-06-12	bank_transfer	{"receipt_number": "RCP-2026-0065", "student_name": "Ayaan Verma", "admission_number": "PA-2024-000002", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "12-Jun-2026", "raw_date": "12-Jun-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0065", "amount": 9500.0, "invoice_number": "INV-2026-0130", "notes": "Payment #65 for Ayaan (Padata.xlsx row 66)"}	2026-11-04 11:14:22.322779+00
66	RCP-2026-0066	66	138	15000.00	2026-06-13	bank_transfer	{"receipt_number": "RCP-2026-0066", "student_name": "Samruddhi Bhide", "admission_number": "PA-2024-000010", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "13-Jun-2026", "raw_date": "13-Jun-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0066", "amount": 15000.0, "invoice_number": "INV-2026-0138", "notes": "Payment #66 for Samruddhi (Padata.xlsx row 67)"}	2026-11-04 11:14:22.322779+00
67	RCP-2026-0067	67	146	10000.00	2026-06-15	bank_transfer	{"receipt_number": "RCP-2026-0067", "student_name": "Vedant Gokhale", "admission_number": "PA-2024-000018", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "15-Jun-2026", "raw_date": "15-Jun-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0067", "amount": 10000.0, "invoice_number": "INV-2026-0146", "notes": "Payment #67 for Vedant (Padata.xlsx row 68)"}	2026-11-04 11:14:22.322779+00
68	RCP-2026-0068	68	150	8000.00	2026-06-18	bank_transfer	{"receipt_number": "RCP-2026-0068", "student_name": "Avner Rao", "admission_number": "PA-2024-000022", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "18-Jun-2026", "raw_date": "18-Jun-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0068", "amount": 8000.0, "invoice_number": "INV-2026-0150", "notes": "Payment #68 for Avner (Padata.xlsx row 69)"}	2026-11-04 11:14:22.322779+00
69	RCP-2026-0069	69	147	16400.00	2026-06-18	bank_transfer	{"receipt_number": "RCP-2026-0069", "student_name": "Khushi Gadgil", "admission_number": "PA-2024-000019", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "18-Jun-2026", "raw_date": "18-Jun-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0069", "amount": 16400.0, "invoice_number": "INV-2026-0147", "notes": "Payment #69 for Khushi (Padata.xlsx row 70)"}	2026-11-04 11:14:22.322779+00
70	RCP-2026-0070	70	135	10000.00	2026-06-18	cash	{"receipt_number": "RCP-2026-0070", "student_name": "Riddhima Mehta", "admission_number": "PA-2024-000007", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "18-Jun-2026", "raw_date": "18-Jun-2026", "payment_method": "cash", "transaction_reference": "TXN-2026-0070", "amount": 10000.0, "invoice_number": "INV-2026-0135", "notes": "Payment #70 for Riddhima (Padata.xlsx row 71)"}	2026-11-04 11:14:22.322779+00
71	RCP-2026-0071	71	144	8500.00	2026-06-18	bank_transfer	{"receipt_number": "RCP-2026-0071", "student_name": "Simran Malhotra", "admission_number": "PA-2024-000016", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "18-Jun-2026", "raw_date": "18-Jun-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0071", "amount": 8500.0, "invoice_number": "INV-2026-0144", "notes": "Payment #71 for Simran (Padata.xlsx row 72)"}	2026-11-04 11:14:22.322779+00
72	RCP-2026-0072	72	158	7500.00	2026-06-19	upi	{"receipt_number": "RCP-2026-0072", "student_name": "Aliya Joshi", "admission_number": "PA-2024-000030", "standard": "Class VIII", "batch": "Batch A (Morning)", "payment_date": "19-Jun-2026", "raw_date": "19-Jun-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0072", "amount": 7500.0, "invoice_number": "INV-2026-0158", "notes": "Payment #72 for Aliya (Padata.xlsx row 73)"}	2026-11-04 11:14:22.322779+00
73	RCP-2026-0073	73	151	10000.00	2026-06-24	bank_transfer	{"receipt_number": "RCP-2026-0073", "student_name": "Apika Shetty", "admission_number": "PA-2024-000023", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "24-Jun-2026", "raw_date": "24-Jun-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0073", "amount": 10000.0, "invoice_number": "INV-2026-0151", "notes": "Payment #73 for Apika (Padata.xlsx row 74)"}	2026-11-04 11:14:22.322779+00
74	RCP-2026-0074	74	145	10000.00	2026-06-25	bank_transfer	{"receipt_number": "RCP-2026-0074", "student_name": "Kashish Sawant", "admission_number": "PA-2024-000017", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "25-Jun-2026", "raw_date": "25-Jun-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0074", "amount": 10000.0, "invoice_number": "INV-2026-0145", "notes": "Payment #74 for Kashish (Padata.xlsx row 75)"}	2026-11-04 11:14:22.322779+00
75	RCP-2026-0075	75	131	10000.00	2026-06-29	upi	{"receipt_number": "RCP-2026-0075", "student_name": "Netham Patil", "admission_number": "PA-2024-000003", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "29-Jun-2026", "raw_date": "29-Jun-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0075", "amount": 10000.0, "invoice_number": "INV-2026-0131", "notes": "Payment #75 for Netham (Padata.xlsx row 76)"}	2026-11-04 11:14:22.322779+00
76	RCP-2026-0076	76	161	7500.00	2026-06-30	cheque	{"receipt_number": "RCP-2026-0076", "student_name": "Chehek Pawar", "admission_number": "PA-2024-000033", "standard": "Class VIII", "batch": "Batch A (Morning)", "payment_date": "30-Jun-2026", "raw_date": "30-Jun-2026", "payment_method": "cheque", "transaction_reference": "TXN-2026-0076", "amount": 7500.0, "invoice_number": "INV-2026-0161", "notes": "Payment #76 for Chehek (Padata.xlsx row 77)"}	2026-11-04 11:14:22.322779+00
77	RCP-2026-0077	77	139	15000.00	2026-07-02	cash	{"receipt_number": "RCP-2026-0077", "student_name": "Aman Chavan", "admission_number": "PA-2024-000011", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "02-Jul-2026", "raw_date": "02-Jul-2026", "payment_method": "cash", "transaction_reference": "TXN-2026-0077", "amount": 15000.0, "invoice_number": "INV-2026-0139", "notes": "Payment #77 for Aman (Padata.xlsx row 78)"}	2026-11-04 11:14:22.322779+00
78	RCP-2026-0078	78	133	9500.00	2026-07-02	upi	{"receipt_number": "RCP-2026-0078", "student_name": "Savesh Kulkarni", "admission_number": "PA-2024-000005", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "02-Jul-2026", "raw_date": "02-Jul-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0078", "amount": 9500.0, "invoice_number": "INV-2026-0133", "notes": "Payment #78 for Savesh (Padata.xlsx row 79)"}	2026-11-04 11:14:22.322779+00
79	RCP-2026-0079	79	137	8500.00	2026-07-03	bank_transfer	{"receipt_number": "RCP-2026-0079", "student_name": "Raudrita Pawar", "admission_number": "PA-2024-000009", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "03-Jul-2026", "raw_date": "03-Jul-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0079", "amount": 8500.0, "invoice_number": "INV-2026-0137", "notes": "Payment #79 for Raudrita (Padata.xlsx row 80)"}	2026-11-04 11:14:22.322779+00
80	RCP-2026-0080	80	146	11000.00	2026-07-03	bank_transfer	{"receipt_number": "RCP-2026-0080", "student_name": "Vedant Gokhale", "admission_number": "PA-2024-000018", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "03-Jul-2026", "raw_date": "03-Jul-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0080", "amount": 11000.0, "invoice_number": "INV-2026-0146", "notes": "Payment #80 for Vedant (Padata.xlsx row 81)"}	2026-11-04 11:14:22.322779+00
81	RCP-2026-0081	81	149	8500.00	2026-07-04	upi	{"receipt_number": "RCP-2026-0081", "student_name": "Johan Iyer", "admission_number": "PA-2024-000021", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "04-Jul-2026", "raw_date": "04-Jul-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0081", "amount": 8500.0, "invoice_number": "INV-2026-0149", "notes": "Payment #81 for Johan (Padata.xlsx row 82)"}	2026-11-04 11:14:22.322779+00
82	RCP-2026-0082	82	155	8000.00	2026-07-08	bank_transfer	{"receipt_number": "RCP-2026-0082", "student_name": "Aadya Patil", "admission_number": "PA-2024-000027", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "08-Jul-2026", "raw_date": "08-Jul-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0082", "amount": 8000.0, "invoice_number": "INV-2026-0155", "notes": "Payment #82 for Aadya (Padata.xlsx row 83)"}	2026-11-04 11:14:22.322779+00
83	RCP-2026-0083	83	147	8500.00	2026-07-08	bank_transfer	{"receipt_number": "RCP-2026-0083", "student_name": "Khushi Gadgil", "admission_number": "PA-2024-000019", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "08-Jul-2026", "raw_date": "08-Jul-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0083", "amount": 8500.0, "invoice_number": "INV-2026-0147", "notes": "Payment #83 for Khushi (Padata.xlsx row 84)"}	2026-11-04 11:14:22.322779+00
84	RCP-2026-0084	84	148	8500.00	2026-07-08	upi	{"receipt_number": "RCP-2026-0084", "student_name": "Mahek Nair", "admission_number": "PA-2024-000020", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "08-Jul-2026", "raw_date": "08-Jul-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0084", "amount": 8500.0, "invoice_number": "INV-2026-0148", "notes": "Payment #84 for Mahek (Padata.xlsx row 85)"}	2026-11-04 11:14:22.322779+00
85	RCP-2026-0085	85	163	10000.00	2026-07-09	bank_transfer	{"receipt_number": "RCP-2026-0085", "student_name": "Aditya Chavan", "admission_number": "PA-2024-000035", "standard": "Class IX", "batch": "Batch A (Morning)", "payment_date": "09-Jul-2026", "raw_date": "09-Jul-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0085", "amount": 10000.0, "invoice_number": "INV-2026-0163", "notes": "Payment #85 for Aditya (Padata.xlsx row 86)"}	2026-11-04 11:14:22.322779+00
86	RCP-2026-0086	86	153	12000.00	2026-07-09	bank_transfer	{"receipt_number": "RCP-2026-0086", "student_name": "Afton Sharma", "admission_number": "PA-2024-000025", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "09-Jul-2026", "raw_date": "09-Jul-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0086", "amount": 12000.0, "invoice_number": "INV-2026-0153", "notes": "Payment #86 for Afton (Padata.xlsx row 87)"}	2026-11-04 11:14:22.322779+00
87	RCP-2026-0087	87	134	8500.00	2026-07-09	upi	{"receipt_number": "RCP-2026-0087", "student_name": "Ansh Joshi", "admission_number": "PA-2024-000006", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "09-Jul-2026", "raw_date": "09-Jul-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0087", "amount": 8500.0, "invoice_number": "INV-2026-0134", "notes": "Payment #87 for Ansh (Padata.xlsx row 88)"}	2026-11-04 11:14:22.322779+00
88	RCP-2026-0088	88	129	9500.00	2026-07-09	bank_transfer	{"receipt_number": "RCP-2026-0088", "student_name": "Rajnees Sharma", "admission_number": "PA-2024-000001", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "09-Jul-2026", "raw_date": "09-Jul-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0088", "amount": 9500.0, "invoice_number": "INV-2026-0129", "notes": "Payment #88 for Rajnees (Padata.xlsx row 89)"}	2026-11-04 11:14:22.322779+00
89	RCP-2026-0089	89	132	4000.00	2026-07-09	bank_transfer	{"receipt_number": "RCP-2026-0089", "student_name": "Shreshta Deshmukh", "admission_number": "PA-2024-000004", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "09-Jul-2026", "raw_date": "09-Jul-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0089", "amount": 4000.0, "invoice_number": "INV-2026-0132", "notes": "Payment #89 for Shreshta (Padata.xlsx row 90)"}	2026-11-04 11:14:22.322779+00
90	RCP-2026-0090	90	165	6000.00	2026-07-09	upi	{"receipt_number": "RCP-2026-0090", "student_name": "Sukhmeet Mistry", "admission_number": "PA-2024-000037", "standard": "Class IX", "batch": "Batch A (Morning)", "payment_date": "09-Jul-2026", "raw_date": "09-Jul-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0090", "amount": 6000.0, "invoice_number": "INV-2026-0165", "notes": "Payment #90 for Sukhmeet (Padata.xlsx row 91)"}	2026-11-04 11:14:22.322779+00
91	RCP-2026-0091	91	157	7000.00	2026-07-10	cash	{"receipt_number": "RCP-2026-0091", "student_name": "Puneeta Kulkarni", "admission_number": "PA-2024-000029", "standard": "Class VIII", "batch": "Batch A (Morning)", "payment_date": "10-Jul-2026", "raw_date": "10-Jul-2026", "payment_method": "cash", "transaction_reference": "TXN-2026-0091", "amount": 7000.0, "invoice_number": "INV-2026-0157", "notes": "Payment #91 for Puneeta (Padata.xlsx row 92)"}	2026-11-04 11:14:22.322779+00
92	RCP-2026-0092	92	140	7500.00	2026-07-11	bank_transfer	{"receipt_number": "RCP-2026-0092", "student_name": "Ashwin Tambe", "admission_number": "PA-2024-000012", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "11-Jul-2026", "raw_date": "11-Jul-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0092", "amount": 7500.0, "invoice_number": "INV-2026-0140", "notes": "Payment #92 for Ashwin (Padata.xlsx row 93)"}	2026-11-04 11:14:22.322779+00
93	RCP-2026-0093	93	158	7500.00	2026-07-12	upi	{"receipt_number": "RCP-2026-0093", "student_name": "Aliya Joshi", "admission_number": "PA-2024-000030", "standard": "Class VIII", "batch": "Batch A (Morning)", "payment_date": "12-Jul-2026", "raw_date": "12-Jul-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0093", "amount": 7500.0, "invoice_number": "INV-2026-0158", "notes": "Payment #93 for Aliya (Padata.xlsx row 94)"}	2026-11-04 11:14:22.322779+00
94	RCP-2026-0094	94	144	8500.00	2026-07-14	bank_transfer	{"receipt_number": "RCP-2026-0094", "student_name": "Simran Malhotra", "admission_number": "PA-2024-000016", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "14-Jul-2026", "raw_date": "14-Jul-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0094", "amount": 8500.0, "invoice_number": "INV-2026-0144", "notes": "Payment #94 for Simran (Padata.xlsx row 95)"}	2026-11-04 11:14:22.322779+00
95	RCP-2026-0095	95	142	8000.00	2026-07-16	cheque	{"receipt_number": "RCP-2026-0095", "student_name": "Satnam Bhatia", "admission_number": "PA-2024-000014", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "16-Jul-2026", "raw_date": "16-Jul-2026", "payment_method": "cheque", "transaction_reference": "TXN-2026-0095", "amount": 8000.0, "invoice_number": "INV-2026-0142", "notes": "Payment #95 for Satnam (Padata.xlsx row 96)"}	2026-11-04 11:14:22.322779+00
96	RCP-2026-0096	96	150	8000.00	2026-07-17	upi	{"receipt_number": "RCP-2026-0096", "student_name": "Avner Rao", "admission_number": "PA-2024-000022", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "17-Jul-2026", "raw_date": "17-Jul-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0096", "amount": 8000.0, "invoice_number": "INV-2026-0150", "notes": "Payment #96 for Avner (Padata.xlsx row 97)"}	2026-11-04 11:14:22.322779+00
97	RCP-2026-0097	97	145	10000.00	2026-07-24	bank_transfer	{"receipt_number": "RCP-2026-0097", "student_name": "Kashish Sawant", "admission_number": "PA-2024-000017", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "24-Jul-2026", "raw_date": "24-Jul-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0097", "amount": 10000.0, "invoice_number": "INV-2026-0145", "notes": "Payment #97 for Kashish (Padata.xlsx row 98)"}	2026-11-04 11:14:22.322779+00
98	RCP-2026-0098	98	130	9500.00	2026-07-30	cash	{"receipt_number": "RCP-2026-0098", "student_name": "Ayaan Verma", "admission_number": "PA-2024-000002", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "30-Jul-2026", "raw_date": "30-Jul-2026", "payment_method": "cash", "transaction_reference": "TXN-2026-0098", "amount": 9500.0, "invoice_number": "INV-2026-0130", "notes": "Payment #98 for Ayaan (Padata.xlsx row 99)"}	2026-11-04 11:14:22.322779+00
99	RCP-2026-0099	99	133	9500.00	2026-07-30	upi	{"receipt_number": "RCP-2026-0099", "student_name": "Savesh Kulkarni", "admission_number": "PA-2024-000005", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "30-Jul-2026", "raw_date": "30-Jul-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0099", "amount": 9500.0, "invoice_number": "INV-2026-0133", "notes": "Payment #99 for Savesh (Padata.xlsx row 100)"}	2026-11-04 11:14:22.322779+00
100	RCP-2026-0100	100	154	50000.00	2026-08-01	bank_transfer	{"receipt_number": "RCP-2026-0100", "student_name": "Maahi Verma", "admission_number": "PA-2024-000026", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "01-Aug-2026", "raw_date": "01-Aug-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0100", "amount": 50000.0, "invoice_number": "INV-2026-0154", "notes": "Payment #100 for Maahi (Padata.xlsx row 101)"}	2026-11-04 11:14:22.322779+00
101	RCP-2026-0101	101	139	15000.00	2026-08-02	bank_transfer	{"receipt_number": "RCP-2026-0101", "student_name": "Aman Chavan", "admission_number": "PA-2024-000011", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "02-Aug-2026", "raw_date": "02-Aug-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0101", "amount": 15000.0, "invoice_number": "INV-2026-0139", "notes": "Payment #101 for Aman (Padata.xlsx row 102)"}	2026-11-04 11:14:22.322779+00
102	RCP-2026-0102	102	131	10000.00	2026-08-02	upi	{"receipt_number": "RCP-2026-0102", "student_name": "Netham Patil", "admission_number": "PA-2024-000003", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "02-Aug-2026", "raw_date": "02-Aug-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0102", "amount": 10000.0, "invoice_number": "INV-2026-0131", "notes": "Payment #102 for Netham (Padata.xlsx row 103)"}	2026-11-04 11:14:22.322779+00
103	RCP-2026-0103	103	143	23000.00	2026-08-03	bank_transfer	{"receipt_number": "RCP-2026-0103", "student_name": "Samud Kapoor", "admission_number": "PA-2024-000015", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "03-Aug-2026", "raw_date": "03-Aug-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0103", "amount": 23000.0, "invoice_number": "INV-2026-0143", "notes": "Payment #103 for Samud (Padata.xlsx row 104)"}	2026-11-04 11:14:22.322779+00
104	RCP-2026-0104	104	149	8600.00	2026-08-04	bank_transfer	{"receipt_number": "RCP-2026-0104", "student_name": "Johan Iyer", "admission_number": "PA-2024-000021", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "04-Aug-2026", "raw_date": "04-Aug-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0104", "amount": 8600.0, "invoice_number": "INV-2026-0149", "notes": "Payment #104 for Johan (Padata.xlsx row 105)"}	2026-11-04 11:14:22.322779+00
105	RCP-2026-0105	105	137	8500.00	2026-08-04	upi	{"receipt_number": "RCP-2026-0105", "student_name": "Raudrita Pawar", "admission_number": "PA-2024-000009", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "04-Aug-2026", "raw_date": "04-Aug-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0105", "amount": 8500.0, "invoice_number": "INV-2026-0137", "notes": "Payment #105 for Raudrita (Padata.xlsx row 106)"}	2026-11-04 11:14:22.322779+00
106	RCP-2026-0106	106	141	10000.00	2026-08-05	bank_transfer	{"receipt_number": "RCP-2026-0106", "student_name": "Keshwa Mistry", "admission_number": "PA-2024-000013", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "05-Aug-2026", "raw_date": "05-Aug-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0106", "amount": 10000.0, "invoice_number": "INV-2026-0141", "notes": "Payment #106 for Keshwa (Padata.xlsx row 107)"}	2026-11-04 11:14:22.322779+00
107	RCP-2026-0107	107	141	10000.00	2026-08-05	bank_transfer	{"receipt_number": "RCP-2026-0107", "student_name": "Keshwa Mistry", "admission_number": "PA-2024-000013", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "05-Aug-2026", "raw_date": "05-Aug-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0107", "amount": 10000.0, "invoice_number": "INV-2026-0141", "notes": "Payment #107 for Keshwa (Padata.xlsx row 108)"}	2026-11-04 11:14:22.322779+00
108	RCP-2026-0108	108	152	7500.00	2026-08-06	upi	{"receipt_number": "RCP-2026-0108", "student_name": "Shrawya Kamath", "admission_number": "PA-2024-000024", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "06-Aug-2026", "raw_date": "06-Aug-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0108", "amount": 7500.0, "invoice_number": "INV-2026-0152", "notes": "Payment #108 for Shrawya (Padata.xlsx row 109)"}	2026-11-04 11:14:22.322779+00
109	RCP-2026-0109	109	151	10000.00	2026-08-08	bank_transfer	{"receipt_number": "RCP-2026-0109", "student_name": "Apika Shetty", "admission_number": "PA-2024-000023", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "08-Aug-2026", "raw_date": "08-Aug-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0109", "amount": 10000.0, "invoice_number": "INV-2026-0151", "notes": "Payment #109 for Apika (Padata.xlsx row 110)"}	2026-11-04 11:14:22.322779+00
110	RCP-2026-0110	110	129	9500.00	2026-08-09	bank_transfer	{"receipt_number": "RCP-2026-0110", "student_name": "Rajnees Sharma", "admission_number": "PA-2024-000001", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "09-Aug-2026", "raw_date": "09-Aug-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0110", "amount": 9500.0, "invoice_number": "INV-2026-0129", "notes": "Payment #110 for Rajnees (Padata.xlsx row 111)"}	2026-11-04 11:14:22.322779+00
111	RCP-2026-0111	111	155	8000.00	2026-08-10	upi	{"receipt_number": "RCP-2026-0111", "student_name": "Aadya Patil", "admission_number": "PA-2024-000027", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "10-Aug-2026", "raw_date": "10-Aug-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0111", "amount": 8000.0, "invoice_number": "INV-2026-0155", "notes": "Payment #111 for Aadya (Padata.xlsx row 112)"}	2026-11-04 11:14:22.322779+00
112	RCP-2026-0112	112	134	8500.00	2026-08-10	cash	{"receipt_number": "RCP-2026-0112", "student_name": "Ansh Joshi", "admission_number": "PA-2024-000006", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "10-Aug-2026", "raw_date": "10-Aug-2026", "payment_method": "cash", "transaction_reference": "TXN-2026-0112", "amount": 8500.0, "invoice_number": "INV-2026-0134", "notes": "Payment #112 for Ansh (Padata.xlsx row 113)"}	2026-11-04 11:14:22.322779+00
113	RCP-2026-0113	113	150	8000.00	2026-08-10	bank_transfer	{"receipt_number": "RCP-2026-0113", "student_name": "Avner Rao", "admission_number": "PA-2024-000022", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "10-Aug-2026", "raw_date": "10-Aug-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0113", "amount": 8000.0, "invoice_number": "INV-2026-0150", "notes": "Payment #113 for Avner (Padata.xlsx row 114)"}	2026-11-04 11:14:22.322779+00
114	RCP-2026-0114	114	165	6000.00	2026-08-10	upi	{"receipt_number": "RCP-2026-0114", "student_name": "Sukhmeet Mistry", "admission_number": "PA-2024-000037", "standard": "Class IX", "batch": "Batch A (Morning)", "payment_date": "10-Aug-2026", "raw_date": "10-Aug-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0114", "amount": 6000.0, "invoice_number": "INV-2026-0165", "notes": "Payment #114 for Sukhmeet (Padata.xlsx row 115)"}	2026-11-04 11:14:22.322779+00
115	RCP-2026-0115	115	140	7500.00	2026-08-11	bank_transfer	{"receipt_number": "RCP-2026-0115", "student_name": "Ashwin Tambe", "admission_number": "PA-2024-000012", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "11-Aug-2026", "raw_date": "11-Aug-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0115", "amount": 7500.0, "invoice_number": "INV-2026-0140", "notes": "Payment #115 for Ashwin (Padata.xlsx row 116)"}	2026-11-04 11:14:22.322779+00
116	RCP-2026-0116	116	161	7500.00	2026-08-11	bank_transfer	{"receipt_number": "RCP-2026-0116", "student_name": "Chehek Pawar", "admission_number": "PA-2024-000033", "standard": "Class VIII", "batch": "Batch A (Morning)", "payment_date": "11-Aug-2026", "raw_date": "11-Aug-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0116", "amount": 7500.0, "invoice_number": "INV-2026-0161", "notes": "Payment #116 for Chehek (Padata.xlsx row 117)"}	2026-11-04 11:14:22.322779+00
117	RCP-2026-0117	117	157	7000.00	2026-08-12	upi	{"receipt_number": "RCP-2026-0117", "student_name": "Puneeta Kulkarni", "admission_number": "PA-2024-000029", "standard": "Class VIII", "batch": "Batch A (Morning)", "payment_date": "12-Aug-2026", "raw_date": "12-Aug-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0117", "amount": 7000.0, "invoice_number": "INV-2026-0157", "notes": "Payment #117 for Puneeta (Padata.xlsx row 118)"}	2026-11-04 11:14:22.322779+00
118	RCP-2026-0118	118	132	5000.00	2026-08-12	bank_transfer	{"receipt_number": "RCP-2026-0118", "student_name": "Shreshta Deshmukh", "admission_number": "PA-2024-000004", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "12-Aug-2026", "raw_date": "12-Aug-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0118", "amount": 5000.0, "invoice_number": "INV-2026-0132", "notes": "Payment #118 for Shreshta (Padata.xlsx row 119)"}	2026-11-04 11:14:22.322779+00
119	RCP-2026-0119	119	142	6000.00	2026-08-20	cash	{"receipt_number": "RCP-2026-0119", "student_name": "Satnam Bhatia", "admission_number": "PA-2024-000014", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "20-Aug-2026", "raw_date": "20-Aug-2026", "payment_method": "cash", "transaction_reference": "TXN-2026-0119", "amount": 6000.0, "invoice_number": "INV-2026-0142", "notes": "Payment #119 for Satnam (Padata.xlsx row 120)"}	2026-11-04 11:14:22.322779+00
120	RCP-2026-0120	120	158	7500.00	2026-08-22	upi	{"receipt_number": "RCP-2026-0120", "student_name": "Aliya Joshi", "admission_number": "PA-2024-000030", "standard": "Class VIII", "batch": "Batch A (Morning)", "payment_date": "22-Aug-2026", "raw_date": "22-Aug-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0120", "amount": 7500.0, "invoice_number": "INV-2026-0158", "notes": "Payment #120 for Aliya (Padata.xlsx row 121)"}	2026-11-04 11:14:22.322779+00
121	RCP-2026-0121	121	145	10000.00	2026-08-25	bank_transfer	{"receipt_number": "RCP-2026-0121", "student_name": "Kashish Sawant", "admission_number": "PA-2024-000017", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "25-Aug-2026", "raw_date": "25-Aug-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0121", "amount": 10000.0, "invoice_number": "INV-2026-0145", "notes": "Payment #121 for Kashish (Padata.xlsx row 122)"}	2026-11-04 11:14:22.322779+00
122	RCP-2026-0122	122	144	8100.00	2026-08-25	bank_transfer	{"receipt_number": "RCP-2026-0122", "student_name": "Simran Malhotra", "admission_number": "PA-2024-000016", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "25-Aug-2026", "raw_date": "25-Aug-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0122", "amount": 8100.0, "invoice_number": "INV-2026-0144", "notes": "Payment #122 for Simran (Padata.xlsx row 123)"}	2026-11-04 11:14:22.322779+00
123	RCP-2026-0123	123	139	10000.00	2026-08-29	upi	{"receipt_number": "RCP-2026-0123", "student_name": "Aman Chavan", "admission_number": "PA-2024-000011", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "29-Aug-2026", "raw_date": "29-Aug-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0123", "amount": 10000.0, "invoice_number": "INV-2026-0139", "notes": "Payment #123 for Aman (Padata.xlsx row 124)"}	2026-11-04 11:14:22.322779+00
124	RCP-2026-0124	124	130	9500.00	2026-08-29	bank_transfer	{"receipt_number": "RCP-2026-0124", "student_name": "Ayaan Verma", "admission_number": "PA-2024-000002", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "29-Aug-2026", "raw_date": "29-Aug-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0124", "amount": 9500.0, "invoice_number": "INV-2026-0130", "notes": "Payment #124 for Ayaan (Padata.xlsx row 125)"}	2026-11-04 11:14:22.322779+00
125	RCP-2026-0125	125	131	10000.00	2026-08-29	bank_transfer	{"receipt_number": "RCP-2026-0125", "student_name": "Netham Patil", "admission_number": "PA-2024-000003", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "29-Aug-2026", "raw_date": "29-Aug-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0125", "amount": 10000.0, "invoice_number": "INV-2026-0131", "notes": "Payment #125 for Netham (Padata.xlsx row 126)"}	2026-11-04 11:14:22.322779+00
126	RCP-2026-0126	126	153	15000.00	2026-09-01	cash	{"receipt_number": "RCP-2026-0126", "student_name": "Afton Sharma", "admission_number": "PA-2024-000025", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "01-Sep-2026", "raw_date": "01-Sep-2026", "payment_method": "cash", "transaction_reference": "TXN-2026-0126", "amount": 15000.0, "invoice_number": "INV-2026-0153", "notes": "Payment #126 for Afton (Padata.xlsx row 127)"}	2026-11-04 11:14:22.322779+00
127	RCP-2026-0127	127	150	8000.00	2026-09-01	bank_transfer	{"receipt_number": "RCP-2026-0127", "student_name": "Avner Rao", "admission_number": "PA-2024-000022", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "01-Sep-2026", "raw_date": "01-Sep-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0127", "amount": 8000.0, "invoice_number": "INV-2026-0150", "notes": "Payment #127 for Avner (Padata.xlsx row 128)"}	2026-11-04 11:14:22.322779+00
128	RCP-2026-0128	128	144	8500.00	2026-09-01	bank_transfer	{"receipt_number": "RCP-2026-0128", "student_name": "Simran Malhotra", "admission_number": "PA-2024-000016", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "01-Sep-2026", "raw_date": "01-Sep-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0128", "amount": 8500.0, "invoice_number": "INV-2026-0144", "notes": "Payment #128 for Simran (Padata.xlsx row 129)"}	2026-11-04 11:14:22.322779+00
129	RCP-2026-0129	129	163	10000.00	2026-09-05	upi	{"receipt_number": "RCP-2026-0129", "student_name": "Aditya Chavan", "admission_number": "PA-2024-000035", "standard": "Class IX", "batch": "Batch A (Morning)", "payment_date": "05-Sep-2026", "raw_date": "05-Sep-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0129", "amount": 10000.0, "invoice_number": "INV-2026-0163", "notes": "Payment #129 for Aditya (Padata.xlsx row 130)"}	2026-11-04 11:14:22.322779+00
130	RCP-2026-0130	130	137	8500.00	2026-09-05	bank_transfer	{"receipt_number": "RCP-2026-0130", "student_name": "Raudrita Pawar", "admission_number": "PA-2024-000009", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "05-Sep-2026", "raw_date": "05-Sep-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0130", "amount": 8500.0, "invoice_number": "INV-2026-0137", "notes": "Payment #130 for Raudrita (Padata.xlsx row 131)"}	2026-11-04 11:14:22.322779+00
131	RCP-2026-0131	131	149	8500.00	2026-09-07	bank_transfer	{"receipt_number": "RCP-2026-0131", "student_name": "Johan Iyer", "admission_number": "PA-2024-000021", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "07-Sep-2026", "raw_date": "07-Sep-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0131", "amount": 8500.0, "invoice_number": "INV-2026-0149", "notes": "Payment #131 for Johan (Padata.xlsx row 132)"}	2026-11-04 11:14:22.322779+00
132	RCP-2026-0132	132	129	9500.00	2026-09-09	upi	{"receipt_number": "RCP-2026-0132", "student_name": "Rajnees Sharma", "admission_number": "PA-2024-000001", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "09-Sep-2026", "raw_date": "09-Sep-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0132", "amount": 9500.0, "invoice_number": "INV-2026-0129", "notes": "Payment #132 for Rajnees (Padata.xlsx row 133)"}	2026-11-04 11:14:22.322779+00
133	RCP-2026-0133	133	138	15000.00	2026-09-09	cash	{"receipt_number": "RCP-2026-0133", "student_name": "Samruddhi Bhide", "admission_number": "PA-2024-000010", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "09-Sep-2026", "raw_date": "09-Sep-2026", "payment_method": "cash", "transaction_reference": "TXN-2026-0133", "amount": 15000.0, "invoice_number": "INV-2026-0138", "notes": "Payment #133 for Samruddhi (Padata.xlsx row 134)"}	2026-11-04 11:14:22.322779+00
134	RCP-2026-0134	134	133	9500.00	2026-09-09	bank_transfer	{"receipt_number": "RCP-2026-0134", "student_name": "Savesh Kulkarni", "admission_number": "PA-2024-000005", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "09-Sep-2026", "raw_date": "09-Sep-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0134", "amount": 9500.0, "invoice_number": "INV-2026-0133", "notes": "Payment #134 for Savesh (Padata.xlsx row 135)"}	2026-11-04 11:14:22.322779+00
135	RCP-2026-0135	135	140	7700.00	2026-09-11	upi	{"receipt_number": "RCP-2026-0135", "student_name": "Ashwin Tambe", "admission_number": "PA-2024-000012", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "11-Sep-2026", "raw_date": "11-Sep-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0135", "amount": 7700.0, "invoice_number": "INV-2026-0140", "notes": "Payment #135 for Ashwin (Padata.xlsx row 136)"}	2026-11-04 11:14:22.322779+00
136	RCP-2026-0136	136	165	6000.00	2026-09-11	bank_transfer	{"receipt_number": "RCP-2026-0136", "student_name": "Sukhmeet Mistry", "admission_number": "PA-2024-000037", "standard": "Class IX", "batch": "Batch A (Morning)", "payment_date": "11-Sep-2026", "raw_date": "11-Sep-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0136", "amount": 6000.0, "invoice_number": "INV-2026-0165", "notes": "Payment #136 for Sukhmeet (Padata.xlsx row 137)"}	2026-11-04 11:14:22.322779+00
137	RCP-2026-0137	137	155	8000.00	2026-09-16	bank_transfer	{"receipt_number": "RCP-2026-0137", "student_name": "Aadya Patil", "admission_number": "PA-2024-000027", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "16-Sep-2026", "raw_date": "16-Sep-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0137", "amount": 8000.0, "invoice_number": "INV-2026-0155", "notes": "Payment #137 for Aadya (Padata.xlsx row 138)"}	2026-11-04 11:14:22.322779+00
138	RCP-2026-0138	138	134	8500.00	2026-09-16	upi	{"receipt_number": "RCP-2026-0138", "student_name": "Ansh Joshi", "admission_number": "PA-2024-000006", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "16-Sep-2026", "raw_date": "16-Sep-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0138", "amount": 8500.0, "invoice_number": "INV-2026-0134", "notes": "Payment #138 for Ansh (Padata.xlsx row 139)"}	2026-11-04 11:14:22.322779+00
139	RCP-2026-0139	139	157	7000.00	2026-09-16	bank_transfer	{"receipt_number": "RCP-2026-0139", "student_name": "Puneeta Kulkarni", "admission_number": "PA-2024-000029", "standard": "Class VIII", "batch": "Batch A (Morning)", "payment_date": "16-Sep-2026", "raw_date": "16-Sep-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0139", "amount": 7000.0, "invoice_number": "INV-2026-0157", "notes": "Payment #139 for Puneeta (Padata.xlsx row 140)"}	2026-11-04 11:14:22.322779+00
140	RCP-2026-0140	140	143	10000.00	2026-09-23	cash	{"receipt_number": "RCP-2026-0140", "student_name": "Samud Kapoor", "admission_number": "PA-2024-000015", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "23-Sep-2026", "raw_date": "23-Sep-2026", "payment_method": "cash", "transaction_reference": "TXN-2026-0140", "amount": 10000.0, "invoice_number": "INV-2026-0143", "notes": "Payment #140 for Samud (Padata.xlsx row 141)"}	2026-11-04 11:14:22.322779+00
141	RCP-2026-0141	141	145	10000.00	2026-09-25	upi	{"receipt_number": "RCP-2026-0141", "student_name": "Kashish Sawant", "admission_number": "PA-2024-000017", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "25-Sep-2026", "raw_date": "25-Sep-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0141", "amount": 10000.0, "invoice_number": "INV-2026-0145", "notes": "Payment #141 for Kashish (Padata.xlsx row 142)"}	2026-11-04 11:14:22.322779+00
142	RCP-2026-0142	142	133	9500.00	2026-10-04	bank_transfer	{"receipt_number": "RCP-2026-0142", "student_name": "Savesh Kulkarni", "admission_number": "PA-2024-000005", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "04-Oct-2026", "raw_date": "04-Oct-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0142", "amount": 9500.0, "invoice_number": "INV-2026-0133", "notes": "Payment #142 for Savesh (Padata.xlsx row 143)"}	2026-11-04 11:14:22.322779+00
143	RCP-2026-0143	143	153	58000.00	2026-10-06	bank_transfer	{"receipt_number": "RCP-2026-0143", "student_name": "Afton Sharma", "admission_number": "PA-2024-000025", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "06-Oct-2026", "raw_date": "06-Oct-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0143", "amount": 58000.0, "invoice_number": "INV-2026-0153", "notes": "Payment #143 for Afton (Padata.xlsx row 144)"}	2026-11-04 11:14:22.322779+00
144	RCP-2026-0144	144	157	7000.00	2026-10-06	upi	{"receipt_number": "RCP-2026-0144", "student_name": "Puneeta Kulkarni", "admission_number": "PA-2024-000029", "standard": "Class VIII", "batch": "Batch A (Morning)", "payment_date": "06-Oct-2026", "raw_date": "06-Oct-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0144", "amount": 7000.0, "invoice_number": "INV-2026-0157", "notes": "Payment #144 for Puneeta (Padata.xlsx row 145)"}	2026-11-04 11:14:22.322779+00
145	RCP-2026-0145	145	146	20000.00	2026-10-06	bank_transfer	{"receipt_number": "RCP-2026-0145", "student_name": "Vedant Gokhale", "admission_number": "PA-2024-000018", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "06-Oct-2026", "raw_date": "06-Oct-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0145", "amount": 20000.0, "invoice_number": "INV-2026-0146", "notes": "Payment #145 for Vedant (Padata.xlsx row 146)"}	2026-11-04 11:14:22.322779+00
146	RCP-2026-0146	146	149	8500.00	2026-10-07	bank_transfer	{"receipt_number": "RCP-2026-0146", "student_name": "Johan Iyer", "admission_number": "PA-2024-000021", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "07-Oct-2026", "raw_date": "07-Oct-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0146", "amount": 8500.0, "invoice_number": "INV-2026-0149", "notes": "Payment #146 for Johan (Padata.xlsx row 147)"}	2026-11-04 11:14:22.322779+00
147	RCP-2026-0147	147	137	8500.00	2026-10-07	upi	{"receipt_number": "RCP-2026-0147", "student_name": "Raudrita Pawar", "admission_number": "PA-2024-000009", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "07-Oct-2026", "raw_date": "07-Oct-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0147", "amount": 8500.0, "invoice_number": "INV-2026-0137", "notes": "Payment #147 for Raudrita (Padata.xlsx row 148)"}	2026-11-04 11:14:22.322779+00
148	RCP-2026-0148	148	150	8000.00	2026-10-09	bank_transfer	{"receipt_number": "RCP-2026-0148", "student_name": "Avner Rao", "admission_number": "PA-2024-000022", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "09-Oct-2026", "raw_date": "09-Oct-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0148", "amount": 8000.0, "invoice_number": "INV-2026-0150", "notes": "Payment #148 for Avner (Padata.xlsx row 149)"}	2026-11-04 11:14:22.322779+00
149	RCP-2026-0149	149	132	8000.00	2026-10-09	bank_transfer	{"receipt_number": "RCP-2026-0149", "student_name": "Shreshta Deshmukh", "admission_number": "PA-2024-000004", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "09-Oct-2026", "raw_date": "09-Oct-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0149", "amount": 8000.0, "invoice_number": "INV-2026-0132", "notes": "Payment #149 for Shreshta (Padata.xlsx row 150)"}	2026-11-04 11:14:22.322779+00
150	RCP-2026-0150	150	129	9500.00	2026-10-10	upi	{"receipt_number": "RCP-2026-0150", "student_name": "Rajnees Sharma", "admission_number": "PA-2024-000001", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "10-Oct-2026", "raw_date": "10-Oct-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0150", "amount": 9500.0, "invoice_number": "INV-2026-0129", "notes": "Payment #150 for Rajnees (Padata.xlsx row 151)"}	2026-11-04 11:14:22.322779+00
151	RCP-2026-0151	151	165	6000.00	2026-10-11	bank_transfer	{"receipt_number": "RCP-2026-0151", "student_name": "Sukhmeet Mistry", "admission_number": "PA-2024-000037", "standard": "Class IX", "batch": "Batch A (Morning)", "payment_date": "11-Oct-2026", "raw_date": "11-Oct-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0151", "amount": 6000.0, "invoice_number": "INV-2026-0165", "notes": "Payment #151 for Sukhmeet (Padata.xlsx row 152)"}	2026-11-04 11:14:22.322779+00
152	RCP-2026-0152	152	155	8000.00	2026-10-12	cheque	{"receipt_number": "RCP-2026-0152", "student_name": "Aadya Patil", "admission_number": "PA-2024-000027", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "12-Oct-2026", "raw_date": "12-Oct-2026", "payment_method": "cheque", "transaction_reference": "TXN-2026-0152", "amount": 8000.0, "invoice_number": "INV-2026-0155", "notes": "Payment #152 for Aadya (Padata.xlsx row 153)"}	2026-11-04 11:14:22.322779+00
153	RCP-2026-0153	153	140	7500.00	2026-10-12	upi	{"receipt_number": "RCP-2026-0153", "student_name": "Ashwin Tambe", "admission_number": "PA-2024-000012", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "12-Oct-2026", "raw_date": "12-Oct-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0153", "amount": 7500.0, "invoice_number": "INV-2026-0140", "notes": "Payment #153 for Ashwin (Padata.xlsx row 154)"}	2026-11-04 11:14:22.322779+00
154	RCP-2026-0154	154	161	15000.00	2026-10-18	cash	{"receipt_number": "RCP-2026-0154", "student_name": "Chehek Pawar", "admission_number": "PA-2024-000033", "standard": "Class VIII", "batch": "Batch A (Morning)", "payment_date": "18-Oct-2026", "raw_date": "18-Oct-2026", "payment_method": "cash", "transaction_reference": "TXN-2026-0154", "amount": 15000.0, "invoice_number": "INV-2026-0161", "notes": "Payment #154 for Chehek (Padata.xlsx row 155)"}	2026-11-04 11:14:22.322779+00
155	RCP-2026-0155	155	158	15000.00	2026-10-22	bank_transfer	{"receipt_number": "RCP-2026-0155", "student_name": "Aliya Joshi", "admission_number": "PA-2024-000030", "standard": "Class VIII", "batch": "Batch A (Morning)", "payment_date": "22-Oct-2026", "raw_date": "22-Oct-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0155", "amount": 15000.0, "invoice_number": "INV-2026-0158", "notes": "Payment #155 for Aliya (Padata.xlsx row 156)"}	2026-11-04 11:14:22.322779+00
156	RCP-2026-0156	156	156	15000.00	2026-10-22	bank_transfer	{"receipt_number": "RCP-2026-0156", "student_name": "Rida Deshmukh", "admission_number": "PA-2024-000028", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "22-Oct-2026", "raw_date": "22-Oct-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0156", "amount": 15000.0, "invoice_number": "INV-2026-0156", "notes": "Payment #156 for Rida (Padata.xlsx row 157)"}	2026-11-04 11:14:22.322779+00
157	RCP-2026-0157	157	145	10000.00	2026-10-23	bank_transfer	{"receipt_number": "RCP-2026-0157", "student_name": "Kashish Sawant", "admission_number": "PA-2024-000017", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "23-Oct-2026", "raw_date": "23-Oct-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0157", "amount": 10000.0, "invoice_number": "INV-2026-0145", "notes": "Payment #157 for Kashish (Padata.xlsx row 158)"}	2026-11-04 11:14:22.322779+00
158	RCP-2026-0158	158	143	10000.00	2026-10-24	bank_transfer	{"receipt_number": "RCP-2026-0158", "student_name": "Samud Kapoor", "admission_number": "PA-2024-000015", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "24-Oct-2026", "raw_date": "24-Oct-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0158", "amount": 10000.0, "invoice_number": "INV-2026-0143", "notes": "Payment #158 for Samud (Padata.xlsx row 159)"}	2026-11-04 11:14:22.322779+00
159	RCP-2026-0159	159	164	10000.00	2026-10-26	upi	{"receipt_number": "RCP-2026-0159", "student_name": "Shriya Tambe", "admission_number": "PA-2024-000036", "standard": "Class IX", "batch": "Batch A (Morning)", "payment_date": "26-Oct-2026", "raw_date": "26-Oct-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0159", "amount": 10000.0, "invoice_number": "INV-2026-0164", "notes": "Payment #159 for Shriya (Padata.xlsx row 160)"}	2026-11-04 11:14:22.322779+00
160	RCP-2026-0160	160	151	10000.00	2026-10-27	bank_transfer	{"receipt_number": "RCP-2026-0160", "student_name": "Apika Shetty", "admission_number": "PA-2024-000023", "standard": "Class IV", "batch": "Batch A (Morning)", "payment_date": "27-Oct-2026", "raw_date": "27-Oct-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0160", "amount": 10000.0, "invoice_number": "INV-2026-0151", "notes": "Payment #160 for Apika (Padata.xlsx row 161)"}	2026-11-04 11:14:22.322779+00
161	RCP-2026-0161	161	134	8500.00	2026-10-30	cash	{"receipt_number": "RCP-2026-0161", "student_name": "Ansh Joshi", "admission_number": "PA-2024-000006", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "30-Oct-2026", "raw_date": "30-Oct-2026", "payment_method": "cash", "transaction_reference": "TXN-2026-0161", "amount": 8500.0, "invoice_number": "INV-2026-0134", "notes": "Payment #161 for Ansh (Padata.xlsx row 162)"}	2026-11-04 11:14:22.322779+00
162	RCP-2026-0162	162	130	9500.00	2026-10-31	upi	{"receipt_number": "RCP-2026-0162", "student_name": "Ayaan Verma", "admission_number": "PA-2024-000002", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "31-Oct-2026", "raw_date": "31-Oct-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0162", "amount": 9500.0, "invoice_number": "INV-2026-0130", "notes": "Payment #162 for Ayaan (Padata.xlsx row 163)"}	2026-11-04 11:14:22.322779+00
163	RCP-2026-0163	163	141	10000.00	2026-10-31	bank_transfer	{"receipt_number": "RCP-2026-0163", "student_name": "Keshwa Mistry", "admission_number": "PA-2024-000013", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "31-Oct-2026", "raw_date": "31-Oct-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0163", "amount": 10000.0, "invoice_number": "INV-2026-0141", "notes": "Payment #163 for Keshwa (Padata.xlsx row 164)"}	2026-11-04 11:14:22.322779+00
164	RCP-2026-0164	164	137	8500.00	2026-11-01	bank_transfer	{"receipt_number": "RCP-2026-0164", "student_name": "Raudrita Pawar", "admission_number": "PA-2024-000009", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "01-Nov-2026", "raw_date": "01-Nov-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0164", "amount": 8500.0, "invoice_number": "INV-2026-0137", "notes": "Payment #164 for Raudrita (Padata.xlsx row 165)"}	2026-11-04 11:14:22.322779+00
165	RCP-2026-0165	165	130	9500.00	2026-11-02	upi	{"receipt_number": "RCP-2026-0165", "student_name": "Ayaan Verma", "admission_number": "PA-2024-000002", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "02-Nov-2026", "raw_date": "02-Nov-2026", "payment_method": "upi", "transaction_reference": "TXN-2026-0165", "amount": 9500.0, "invoice_number": "INV-2026-0130", "notes": "Payment #165 for Ayaan (Padata.xlsx row 166)"}	2026-11-04 11:14:22.322779+00
166	RCP-2026-0166	166	133	9700.00	2026-11-02	bank_transfer	{"receipt_number": "RCP-2026-0166", "student_name": "Savesh Kulkarni", "admission_number": "PA-2024-000005", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "02-Nov-2026", "raw_date": "02-Nov-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0166", "amount": 9700.0, "invoice_number": "INV-2026-0133", "notes": "Payment #166 for Savesh (Padata.xlsx row 167)"}	2026-11-04 11:14:22.322779+00
167	RCP-2026-0167	167	157	7000.00	2026-11-04	bank_transfer	{"receipt_number": "RCP-2026-0167", "student_name": "Puneeta Kulkarni", "admission_number": "PA-2024-000029", "standard": "Class VIII", "batch": "Batch A (Morning)", "payment_date": "04-Nov-2026", "raw_date": "04-Nov-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0167", "amount": 7000.0, "invoice_number": "INV-2026-0157", "notes": "Payment #167 for Puneeta (Padata.xlsx row 168)"}	2026-11-04 11:14:22.322779+00
168	RCP-2026-0168	168	136	55000.00	2026-11-01	cash	{"receipt_number": "RCP-2026-0168", "student_name": "Sonakshi Shah", "admission_number": "PA-2024-000008", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "01-Nov-2026", "raw_date": "01-Nov-2026", "payment_method": "cash", "transaction_reference": "TXN-2026-0168", "amount": 55000.0, "invoice_number": "INV-2026-0136", "notes": "Payment #168 for Sonakshi (Padata.xlsx row 169)"}	2026-11-04 11:14:22.322779+00
169	RCP-2026-0169	169	140	7500.00	2026-09-30	bank_transfer	{"receipt_number": "RCP-2026-0169", "student_name": "Ashwin Tambe", "admission_number": "PA-2024-000012", "standard": "Class X", "batch": "Batch A (Morning)", "payment_date": "30-Sep-2026", "raw_date": "31-Sep-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0169", "amount": 7500.0, "invoice_number": "INV-2026-0140", "notes": "Payment #169 for Ashwin (Padata.xlsx row 170) [Normalized from raw date: 31-Sep-2026]"}	2026-11-04 11:14:22.322779+00
170	RCP-2026-0170	170	162	25000.00	2026-03-31	bank_transfer	{"receipt_number": "RCP-2026-0170", "student_name": "Siddharth Bhide", "admission_number": "PA-2024-000034", "standard": "Class IX", "batch": "Batch A (Morning)", "payment_date": "31-Mar-2026", "raw_date": "31-Mar-2026", "payment_method": "bank_transfer", "transaction_reference": "TXN-2026-0170", "amount": 25000.0, "invoice_number": "INV-2026-0162", "notes": "Payment #170 for Siddharth (Padata.xlsx row 171)"}	2026-11-04 11:14:22.322779+00
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payments (id, student_id, academic_year_id, amount, payment_date, payment_method, transaction_reference, bank_name, cheque_number, cheque_date, notes, status, reversed_at, reversal_reason, reversed_by_id, collected_by_id, created_at) FROM stdin;
1	149	1	8500.00	2026-03-06	bank_transfer	TXN-2026-0001	HDFC Bank	\N	\N	Payment #1 for Johan (Padata.xlsx row 2)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
2	132	1	7000.00	2026-03-09	bank_transfer	TXN-2026-0002	HDFC Bank	\N	\N	Payment #2 for Shreshta (Padata.xlsx row 3)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
3	148	1	8500.00	2026-03-24	upi	TXN-2026-0003	\N	\N	\N	Payment #3 for Mahek (Padata.xlsx row 4)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
4	131	1	15000.00	2026-04-02	bank_transfer	TXN-2026-0004	HDFC Bank	\N	\N	Payment #4 for Netham (Padata.xlsx row 5)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
5	135	1	15000.00	2026-04-03	bank_transfer	TXN-2026-0005	HDFC Bank	\N	\N	Payment #5 for Riddhima (Padata.xlsx row 6)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
6	149	1	8500.00	2026-04-04	upi	TXN-2026-0006	\N	\N	\N	Payment #6 for Johan (Padata.xlsx row 7)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
7	145	1	15000.00	2026-04-04	cash	TXN-2026-0007	\N	\N	\N	Payment #7 for Kashish (Padata.xlsx row 8)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
8	139	1	15000.00	2026-04-06	bank_transfer	TXN-2026-0008	HDFC Bank	\N	\N	Payment #8 for Aman (Padata.xlsx row 9)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
9	144	1	8500.00	2026-04-08	upi	TXN-2026-0009	\N	\N	\N	Payment #9 for Simran (Padata.xlsx row 10)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
10	150	1	8000.00	2026-04-09	bank_transfer	TXN-2026-0010	HDFC Bank	\N	\N	Payment #10 for Avner (Padata.xlsx row 11)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
11	129	1	9500.00	2026-04-09	bank_transfer	TXN-2026-0011	HDFC Bank	\N	\N	Payment #11 for Rajnees (Padata.xlsx row 12)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
12	137	1	8500.00	2026-04-09	upi	TXN-2026-0012	\N	\N	\N	Payment #12 for Raudrita (Padata.xlsx row 13)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
13	132	1	7000.00	2026-04-09	bank_transfer	TXN-2026-0013	HDFC Bank	\N	\N	Payment #13 for Shreshta (Padata.xlsx row 14)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
14	140	1	5000.00	2026-04-10	cash	TXN-2026-0014	\N	\N	\N	Payment #14 for Ashwin (Padata.xlsx row 15)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
15	138	1	15000.00	2026-04-11	bank_transfer	TXN-2026-0015	HDFC Bank	\N	\N	Payment #15 for Samruddhi (Padata.xlsx row 16)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
16	143	1	8500.00	2026-04-11	bank_transfer	TXN-2026-0016	HDFC Bank	\N	\N	Payment #16 for Samud (Padata.xlsx row 17)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
17	133	1	19000.00	2026-04-12	bank_transfer	TXN-2026-0017	HDFC Bank	\N	\N	Payment #17 for Savesh (Padata.xlsx row 18)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
18	134	1	8500.00	2026-04-13	upi	TXN-2026-0018	\N	\N	\N	Payment #18 for Ansh (Padata.xlsx row 19)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
19	157	1	6000.00	2026-04-14	cheque	TXN-2026-0019	\N	\N	\N	Payment #19 for Puneeta (Padata.xlsx row 20)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
20	159	1	9735.00	2026-04-14	bank_transfer	TXN-2026-0020	HDFC Bank	\N	\N	Payment #20 for Siddhant (Padata.xlsx row 21)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
21	151	1	10000.00	2026-04-16	upi	TXN-2026-0021	\N	\N	\N	Payment #21 for Apika (Padata.xlsx row 22)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
22	130	1	9500.00	2026-04-17	bank_transfer	TXN-2026-0022	HDFC Bank	\N	\N	Payment #22 for Ayaan (Padata.xlsx row 23)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
23	152	1	7500.00	2026-04-18	bank_transfer	TXN-2026-0023	HDFC Bank	\N	\N	Payment #23 for Shrawya (Padata.xlsx row 24)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
24	141	1	10000.00	2026-04-26	upi	TXN-2026-0024	\N	\N	\N	Payment #24 for Keshwa (Padata.xlsx row 25)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
25	131	1	10000.00	2026-05-03	bank_transfer	TXN-2026-0025	HDFC Bank	\N	\N	Payment #25 for Netham (Padata.xlsx row 26)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
26	149	1	8500.00	2026-05-04	bank_transfer	TXN-2026-0026	HDFC Bank	\N	\N	Payment #26 for Johan (Padata.xlsx row 27)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
27	142	1	8000.00	2026-05-06	upi	TXN-2026-0027	\N	\N	\N	Payment #27 for Satnam (Padata.xlsx row 28)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
28	133	1	9500.00	2026-05-06	cash	TXN-2026-0028	\N	\N	\N	Payment #28 for Savesh (Padata.xlsx row 29)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
29	139	1	10000.00	2026-05-07	bank_transfer	TXN-2026-0029	HDFC Bank	\N	\N	Payment #29 for Aman (Padata.xlsx row 30)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
30	137	1	8500.00	2026-05-07	upi	TXN-2026-0030	\N	\N	\N	Payment #30 for Raudrita (Padata.xlsx row 31)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
31	155	1	8000.00	2026-05-08	bank_transfer	TXN-2026-0031	HDFC Bank	\N	\N	Payment #31 for Aadya (Padata.xlsx row 32)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
32	134	1	8500.00	2026-05-08	bank_transfer	TXN-2026-0032	HDFC Bank	\N	\N	Payment #32 for Ansh (Padata.xlsx row 33)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
33	144	1	8500.00	2026-05-08	upi	TXN-2026-0033	\N	\N	\N	Payment #33 for Simran (Padata.xlsx row 34)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
34	129	1	9500.00	2026-05-09	bank_transfer	TXN-2026-0034	HDFC Bank	\N	\N	Payment #34 for Rajnees (Padata.xlsx row 35)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
35	143	1	8000.00	2026-05-09	cash	TXN-2026-0035	\N	\N	\N	Payment #35 for Samud (Padata.xlsx row 36)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
36	132	1	7000.00	2026-05-09	upi	TXN-2026-0036	\N	\N	\N	Payment #36 for Shreshta (Padata.xlsx row 37)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
37	140	1	7500.00	2026-05-10	bank_transfer	TXN-2026-0037	HDFC Bank	\N	\N	Payment #37 for Ashwin (Padata.xlsx row 38)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
38	150	1	8000.00	2026-05-10	cheque	TXN-2026-0038	\N	\N	\N	Payment #38 for Avner (Padata.xlsx row 39)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
39	152	1	7500.00	2026-05-10	upi	TXN-2026-0039	\N	\N	\N	Payment #39 for Shrawya (Padata.xlsx row 40)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
40	161	1	7500.00	2026-05-11	bank_transfer	TXN-2026-0040	HDFC Bank	\N	\N	Payment #40 for Chehek (Padata.xlsx row 41)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
41	148	1	8500.00	2026-05-11	bank_transfer	TXN-2026-0041	HDFC Bank	\N	\N	Payment #41 for Mahek (Padata.xlsx row 42)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
42	158	1	7500.00	2026-05-18	upi	TXN-2026-0042	\N	\N	\N	Payment #42 for Aliya (Padata.xlsx row 43)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
43	130	1	9500.00	2026-05-18	bank_transfer	TXN-2026-0043	HDFC Bank	\N	\N	Payment #43 for Ayaan (Padata.xlsx row 44)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
44	135	1	10000.00	2026-05-19	bank_transfer	TXN-2026-0044	HDFC Bank	\N	\N	Payment #44 for Riddhima (Padata.xlsx row 45)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
45	151	1	10000.00	2026-05-26	upi	TXN-2026-0045	\N	\N	\N	Payment #45 for Apika (Padata.xlsx row 46)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
46	145	1	10000.00	2026-05-28	bank_transfer	TXN-2026-0046	HDFC Bank	\N	\N	Payment #46 for Kashish (Padata.xlsx row 47)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
47	139	1	15000.00	2026-05-29	bank_transfer	TXN-2026-0047	HDFC Bank	\N	\N	Payment #47 for Aman (Padata.xlsx row 48)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
48	131	1	10000.00	2026-05-30	upi	TXN-2026-0048	\N	\N	\N	Payment #48 for Netham (Padata.xlsx row 49)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
49	141	1	10000.00	2026-06-01	cash	TXN-2026-0049	\N	\N	\N	Payment #49 for Keshwa (Padata.xlsx row 50)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
50	137	1	8500.00	2026-06-03	bank_transfer	TXN-2026-0050	HDFC Bank	\N	\N	Payment #50 for Raudrita (Padata.xlsx row 51)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
51	159	1	65265.00	2026-06-03	bank_transfer	TXN-2026-0051	HDFC Bank	\N	\N	Payment #51 for Siddhant (Padata.xlsx row 52)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
52	149	1	8500.00	2026-06-05	bank_transfer	TXN-2026-0052	HDFC Bank	\N	\N	Payment #52 for Johan (Padata.xlsx row 53)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
53	148	1	8500.00	2026-06-05	bank_transfer	TXN-2026-0053	HDFC Bank	\N	\N	Payment #53 for Mahek (Padata.xlsx row 54)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
54	152	1	7500.00	2026-06-05	upi	TXN-2026-0054	\N	\N	\N	Payment #54 for Shrawya (Padata.xlsx row 55)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
55	155	1	8000.00	2026-06-07	bank_transfer	TXN-2026-0055	HDFC Bank	\N	\N	Payment #55 for Aadya (Padata.xlsx row 56)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
56	157	1	9000.00	2026-06-08	cash	TXN-2026-0056	\N	\N	\N	Payment #56 for Puneeta (Padata.xlsx row 57)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
57	132	1	7000.00	2026-06-08	upi	TXN-2026-0057	\N	\N	\N	Payment #57 for Shreshta (Padata.xlsx row 58)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
58	129	1	9500.00	2026-06-09	bank_transfer	TXN-2026-0058	HDFC Bank	\N	\N	Payment #58 for Rajnees (Padata.xlsx row 59)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
59	164	1	15000.00	2026-06-09	bank_transfer	TXN-2026-0059	HDFC Bank	\N	\N	Payment #59 for Shriya (Padata.xlsx row 60)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
60	133	1	9500.00	2026-06-10	upi	TXN-2026-0060	\N	\N	\N	Payment #60 for Savesh (Padata.xlsx row 61)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
61	140	1	7500.00	2026-06-11	bank_transfer	TXN-2026-0061	HDFC Bank	\N	\N	Payment #61 for Ashwin (Padata.xlsx row 62)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
62	161	1	7500.00	2026-06-11	bank_transfer	TXN-2026-0062	HDFC Bank	\N	\N	Payment #62 for Chehek (Padata.xlsx row 63)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
63	162	1	25000.00	2026-06-11	cash	TXN-2026-0063	\N	\N	\N	Payment #63 for Siddharth (Padata.xlsx row 64)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
64	165	1	6000.00	2026-06-11	bank_transfer	TXN-2026-0064	HDFC Bank	\N	\N	Payment #64 for Sukhmeet (Padata.xlsx row 65)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
65	130	1	9500.00	2026-06-12	bank_transfer	TXN-2026-0065	HDFC Bank	\N	\N	Payment #65 for Ayaan (Padata.xlsx row 66)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
66	138	1	15000.00	2026-06-13	bank_transfer	TXN-2026-0066	HDFC Bank	\N	\N	Payment #66 for Samruddhi (Padata.xlsx row 67)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
67	146	1	10000.00	2026-06-15	bank_transfer	TXN-2026-0067	HDFC Bank	\N	\N	Payment #67 for Vedant (Padata.xlsx row 68)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
68	150	1	8000.00	2026-06-18	bank_transfer	TXN-2026-0068	HDFC Bank	\N	\N	Payment #68 for Avner (Padata.xlsx row 69)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
69	147	1	16400.00	2026-06-18	bank_transfer	TXN-2026-0069	HDFC Bank	\N	\N	Payment #69 for Khushi (Padata.xlsx row 70)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
70	135	1	10000.00	2026-06-18	cash	TXN-2026-0070	\N	\N	\N	Payment #70 for Riddhima (Padata.xlsx row 71)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
71	144	1	8500.00	2026-06-18	bank_transfer	TXN-2026-0071	HDFC Bank	\N	\N	Payment #71 for Simran (Padata.xlsx row 72)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
72	158	1	7500.00	2026-06-19	upi	TXN-2026-0072	\N	\N	\N	Payment #72 for Aliya (Padata.xlsx row 73)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
73	151	1	10000.00	2026-06-24	bank_transfer	TXN-2026-0073	HDFC Bank	\N	\N	Payment #73 for Apika (Padata.xlsx row 74)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
74	145	1	10000.00	2026-06-25	bank_transfer	TXN-2026-0074	HDFC Bank	\N	\N	Payment #74 for Kashish (Padata.xlsx row 75)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
75	131	1	10000.00	2026-06-29	upi	TXN-2026-0075	\N	\N	\N	Payment #75 for Netham (Padata.xlsx row 76)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
76	161	1	7500.00	2026-06-30	cheque	TXN-2026-0076	\N	\N	\N	Payment #76 for Chehek (Padata.xlsx row 77)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
77	139	1	15000.00	2026-07-02	cash	TXN-2026-0077	\N	\N	\N	Payment #77 for Aman (Padata.xlsx row 78)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
78	133	1	9500.00	2026-07-02	upi	TXN-2026-0078	\N	\N	\N	Payment #78 for Savesh (Padata.xlsx row 79)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
79	137	1	8500.00	2026-07-03	bank_transfer	TXN-2026-0079	HDFC Bank	\N	\N	Payment #79 for Raudrita (Padata.xlsx row 80)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
80	146	1	11000.00	2026-07-03	bank_transfer	TXN-2026-0080	HDFC Bank	\N	\N	Payment #80 for Vedant (Padata.xlsx row 81)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
81	149	1	8500.00	2026-07-04	upi	TXN-2026-0081	\N	\N	\N	Payment #81 for Johan (Padata.xlsx row 82)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
82	155	1	8000.00	2026-07-08	bank_transfer	TXN-2026-0082	HDFC Bank	\N	\N	Payment #82 for Aadya (Padata.xlsx row 83)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
83	147	1	8500.00	2026-07-08	bank_transfer	TXN-2026-0083	HDFC Bank	\N	\N	Payment #83 for Khushi (Padata.xlsx row 84)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
84	148	1	8500.00	2026-07-08	upi	TXN-2026-0084	\N	\N	\N	Payment #84 for Mahek (Padata.xlsx row 85)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
85	163	1	10000.00	2026-07-09	bank_transfer	TXN-2026-0085	HDFC Bank	\N	\N	Payment #85 for Aditya (Padata.xlsx row 86)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
86	153	1	12000.00	2026-07-09	bank_transfer	TXN-2026-0086	HDFC Bank	\N	\N	Payment #86 for Afton (Padata.xlsx row 87)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
87	134	1	8500.00	2026-07-09	upi	TXN-2026-0087	\N	\N	\N	Payment #87 for Ansh (Padata.xlsx row 88)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
88	129	1	9500.00	2026-07-09	bank_transfer	TXN-2026-0088	HDFC Bank	\N	\N	Payment #88 for Rajnees (Padata.xlsx row 89)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
89	132	1	4000.00	2026-07-09	bank_transfer	TXN-2026-0089	HDFC Bank	\N	\N	Payment #89 for Shreshta (Padata.xlsx row 90)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
90	165	1	6000.00	2026-07-09	upi	TXN-2026-0090	\N	\N	\N	Payment #90 for Sukhmeet (Padata.xlsx row 91)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
91	157	1	7000.00	2026-07-10	cash	TXN-2026-0091	\N	\N	\N	Payment #91 for Puneeta (Padata.xlsx row 92)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
92	140	1	7500.00	2026-07-11	bank_transfer	TXN-2026-0092	HDFC Bank	\N	\N	Payment #92 for Ashwin (Padata.xlsx row 93)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
93	158	1	7500.00	2026-07-12	upi	TXN-2026-0093	\N	\N	\N	Payment #93 for Aliya (Padata.xlsx row 94)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
94	144	1	8500.00	2026-07-14	bank_transfer	TXN-2026-0094	HDFC Bank	\N	\N	Payment #94 for Simran (Padata.xlsx row 95)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
95	142	1	8000.00	2026-07-16	cheque	TXN-2026-0095	\N	\N	\N	Payment #95 for Satnam (Padata.xlsx row 96)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
96	150	1	8000.00	2026-07-17	upi	TXN-2026-0096	\N	\N	\N	Payment #96 for Avner (Padata.xlsx row 97)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
97	145	1	10000.00	2026-07-24	bank_transfer	TXN-2026-0097	HDFC Bank	\N	\N	Payment #97 for Kashish (Padata.xlsx row 98)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
98	130	1	9500.00	2026-07-30	cash	TXN-2026-0098	\N	\N	\N	Payment #98 for Ayaan (Padata.xlsx row 99)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
99	133	1	9500.00	2026-07-30	upi	TXN-2026-0099	\N	\N	\N	Payment #99 for Savesh (Padata.xlsx row 100)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
100	154	1	50000.00	2026-08-01	bank_transfer	TXN-2026-0100	HDFC Bank	\N	\N	Payment #100 for Maahi (Padata.xlsx row 101)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
101	139	1	15000.00	2026-08-02	bank_transfer	TXN-2026-0101	HDFC Bank	\N	\N	Payment #101 for Aman (Padata.xlsx row 102)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
102	131	1	10000.00	2026-08-02	upi	TXN-2026-0102	\N	\N	\N	Payment #102 for Netham (Padata.xlsx row 103)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
103	143	1	23000.00	2026-08-03	bank_transfer	TXN-2026-0103	HDFC Bank	\N	\N	Payment #103 for Samud (Padata.xlsx row 104)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
104	149	1	8600.00	2026-08-04	bank_transfer	TXN-2026-0104	HDFC Bank	\N	\N	Payment #104 for Johan (Padata.xlsx row 105)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
105	137	1	8500.00	2026-08-04	upi	TXN-2026-0105	\N	\N	\N	Payment #105 for Raudrita (Padata.xlsx row 106)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
106	141	1	10000.00	2026-08-05	bank_transfer	TXN-2026-0106	HDFC Bank	\N	\N	Payment #106 for Keshwa (Padata.xlsx row 107)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
107	141	1	10000.00	2026-08-05	bank_transfer	TXN-2026-0107	HDFC Bank	\N	\N	Payment #107 for Keshwa (Padata.xlsx row 108)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
108	152	1	7500.00	2026-08-06	upi	TXN-2026-0108	\N	\N	\N	Payment #108 for Shrawya (Padata.xlsx row 109)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
109	151	1	10000.00	2026-08-08	bank_transfer	TXN-2026-0109	HDFC Bank	\N	\N	Payment #109 for Apika (Padata.xlsx row 110)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
110	129	1	9500.00	2026-08-09	bank_transfer	TXN-2026-0110	HDFC Bank	\N	\N	Payment #110 for Rajnees (Padata.xlsx row 111)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
111	155	1	8000.00	2026-08-10	upi	TXN-2026-0111	\N	\N	\N	Payment #111 for Aadya (Padata.xlsx row 112)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
112	134	1	8500.00	2026-08-10	cash	TXN-2026-0112	\N	\N	\N	Payment #112 for Ansh (Padata.xlsx row 113)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
113	150	1	8000.00	2026-08-10	bank_transfer	TXN-2026-0113	HDFC Bank	\N	\N	Payment #113 for Avner (Padata.xlsx row 114)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
114	165	1	6000.00	2026-08-10	upi	TXN-2026-0114	\N	\N	\N	Payment #114 for Sukhmeet (Padata.xlsx row 115)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
115	140	1	7500.00	2026-08-11	bank_transfer	TXN-2026-0115	HDFC Bank	\N	\N	Payment #115 for Ashwin (Padata.xlsx row 116)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
116	161	1	7500.00	2026-08-11	bank_transfer	TXN-2026-0116	HDFC Bank	\N	\N	Payment #116 for Chehek (Padata.xlsx row 117)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
117	157	1	7000.00	2026-08-12	upi	TXN-2026-0117	\N	\N	\N	Payment #117 for Puneeta (Padata.xlsx row 118)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
118	132	1	5000.00	2026-08-12	bank_transfer	TXN-2026-0118	HDFC Bank	\N	\N	Payment #118 for Shreshta (Padata.xlsx row 119)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
119	142	1	6000.00	2026-08-20	cash	TXN-2026-0119	\N	\N	\N	Payment #119 for Satnam (Padata.xlsx row 120)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
120	158	1	7500.00	2026-08-22	upi	TXN-2026-0120	\N	\N	\N	Payment #120 for Aliya (Padata.xlsx row 121)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
121	145	1	10000.00	2026-08-25	bank_transfer	TXN-2026-0121	HDFC Bank	\N	\N	Payment #121 for Kashish (Padata.xlsx row 122)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
122	144	1	8100.00	2026-08-25	bank_transfer	TXN-2026-0122	HDFC Bank	\N	\N	Payment #122 for Simran (Padata.xlsx row 123)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
123	139	1	10000.00	2026-08-29	upi	TXN-2026-0123	\N	\N	\N	Payment #123 for Aman (Padata.xlsx row 124)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
124	130	1	9500.00	2026-08-29	bank_transfer	TXN-2026-0124	HDFC Bank	\N	\N	Payment #124 for Ayaan (Padata.xlsx row 125)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
125	131	1	10000.00	2026-08-29	bank_transfer	TXN-2026-0125	HDFC Bank	\N	\N	Payment #125 for Netham (Padata.xlsx row 126)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
126	153	1	15000.00	2026-09-01	cash	TXN-2026-0126	\N	\N	\N	Payment #126 for Afton (Padata.xlsx row 127)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
127	150	1	8000.00	2026-09-01	bank_transfer	TXN-2026-0127	HDFC Bank	\N	\N	Payment #127 for Avner (Padata.xlsx row 128)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
128	144	1	8500.00	2026-09-01	bank_transfer	TXN-2026-0128	HDFC Bank	\N	\N	Payment #128 for Simran (Padata.xlsx row 129)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
129	163	1	10000.00	2026-09-05	upi	TXN-2026-0129	\N	\N	\N	Payment #129 for Aditya (Padata.xlsx row 130)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
130	137	1	8500.00	2026-09-05	bank_transfer	TXN-2026-0130	HDFC Bank	\N	\N	Payment #130 for Raudrita (Padata.xlsx row 131)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
131	149	1	8500.00	2026-09-07	bank_transfer	TXN-2026-0131	HDFC Bank	\N	\N	Payment #131 for Johan (Padata.xlsx row 132)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
132	129	1	9500.00	2026-09-09	upi	TXN-2026-0132	\N	\N	\N	Payment #132 for Rajnees (Padata.xlsx row 133)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
133	138	1	15000.00	2026-09-09	cash	TXN-2026-0133	\N	\N	\N	Payment #133 for Samruddhi (Padata.xlsx row 134)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
134	133	1	9500.00	2026-09-09	bank_transfer	TXN-2026-0134	HDFC Bank	\N	\N	Payment #134 for Savesh (Padata.xlsx row 135)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
135	140	1	7700.00	2026-09-11	upi	TXN-2026-0135	\N	\N	\N	Payment #135 for Ashwin (Padata.xlsx row 136)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
136	165	1	6000.00	2026-09-11	bank_transfer	TXN-2026-0136	HDFC Bank	\N	\N	Payment #136 for Sukhmeet (Padata.xlsx row 137)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
137	155	1	8000.00	2026-09-16	bank_transfer	TXN-2026-0137	HDFC Bank	\N	\N	Payment #137 for Aadya (Padata.xlsx row 138)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
138	134	1	8500.00	2026-09-16	upi	TXN-2026-0138	\N	\N	\N	Payment #138 for Ansh (Padata.xlsx row 139)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
139	157	1	7000.00	2026-09-16	bank_transfer	TXN-2026-0139	HDFC Bank	\N	\N	Payment #139 for Puneeta (Padata.xlsx row 140)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
140	143	1	10000.00	2026-09-23	cash	TXN-2026-0140	\N	\N	\N	Payment #140 for Samud (Padata.xlsx row 141)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
141	145	1	10000.00	2026-09-25	upi	TXN-2026-0141	\N	\N	\N	Payment #141 for Kashish (Padata.xlsx row 142)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
142	133	1	9500.00	2026-10-04	bank_transfer	TXN-2026-0142	HDFC Bank	\N	\N	Payment #142 for Savesh (Padata.xlsx row 143)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
143	153	1	58000.00	2026-10-06	bank_transfer	TXN-2026-0143	HDFC Bank	\N	\N	Payment #143 for Afton (Padata.xlsx row 144)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
144	157	1	7000.00	2026-10-06	upi	TXN-2026-0144	\N	\N	\N	Payment #144 for Puneeta (Padata.xlsx row 145)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
145	146	1	20000.00	2026-10-06	bank_transfer	TXN-2026-0145	HDFC Bank	\N	\N	Payment #145 for Vedant (Padata.xlsx row 146)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
146	149	1	8500.00	2026-10-07	bank_transfer	TXN-2026-0146	HDFC Bank	\N	\N	Payment #146 for Johan (Padata.xlsx row 147)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
147	137	1	8500.00	2026-10-07	upi	TXN-2026-0147	\N	\N	\N	Payment #147 for Raudrita (Padata.xlsx row 148)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
148	150	1	8000.00	2026-10-09	bank_transfer	TXN-2026-0148	HDFC Bank	\N	\N	Payment #148 for Avner (Padata.xlsx row 149)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
149	132	1	8000.00	2026-10-09	bank_transfer	TXN-2026-0149	HDFC Bank	\N	\N	Payment #149 for Shreshta (Padata.xlsx row 150)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
150	129	1	9500.00	2026-10-10	upi	TXN-2026-0150	\N	\N	\N	Payment #150 for Rajnees (Padata.xlsx row 151)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
151	165	1	6000.00	2026-10-11	bank_transfer	TXN-2026-0151	HDFC Bank	\N	\N	Payment #151 for Sukhmeet (Padata.xlsx row 152)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
152	155	1	8000.00	2026-10-12	cheque	TXN-2026-0152	\N	\N	\N	Payment #152 for Aadya (Padata.xlsx row 153)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
153	140	1	7500.00	2026-10-12	upi	TXN-2026-0153	\N	\N	\N	Payment #153 for Ashwin (Padata.xlsx row 154)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
154	161	1	15000.00	2026-10-18	cash	TXN-2026-0154	\N	\N	\N	Payment #154 for Chehek (Padata.xlsx row 155)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
155	158	1	15000.00	2026-10-22	bank_transfer	TXN-2026-0155	HDFC Bank	\N	\N	Payment #155 for Aliya (Padata.xlsx row 156)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
156	156	1	15000.00	2026-10-22	bank_transfer	TXN-2026-0156	HDFC Bank	\N	\N	Payment #156 for Rida (Padata.xlsx row 157)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
157	145	1	10000.00	2026-10-23	bank_transfer	TXN-2026-0157	HDFC Bank	\N	\N	Payment #157 for Kashish (Padata.xlsx row 158)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
158	143	1	10000.00	2026-10-24	bank_transfer	TXN-2026-0158	HDFC Bank	\N	\N	Payment #158 for Samud (Padata.xlsx row 159)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
159	164	1	10000.00	2026-10-26	upi	TXN-2026-0159	\N	\N	\N	Payment #159 for Shriya (Padata.xlsx row 160)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
160	151	1	10000.00	2026-10-27	bank_transfer	TXN-2026-0160	HDFC Bank	\N	\N	Payment #160 for Apika (Padata.xlsx row 161)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
161	134	1	8500.00	2026-10-30	cash	TXN-2026-0161	\N	\N	\N	Payment #161 for Ansh (Padata.xlsx row 162)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
162	130	1	9500.00	2026-10-31	upi	TXN-2026-0162	\N	\N	\N	Payment #162 for Ayaan (Padata.xlsx row 163)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
163	141	1	10000.00	2026-10-31	bank_transfer	TXN-2026-0163	HDFC Bank	\N	\N	Payment #163 for Keshwa (Padata.xlsx row 164)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
164	137	1	8500.00	2026-11-01	bank_transfer	TXN-2026-0164	HDFC Bank	\N	\N	Payment #164 for Raudrita (Padata.xlsx row 165)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
165	130	1	9500.00	2026-11-02	upi	TXN-2026-0165	\N	\N	\N	Payment #165 for Ayaan (Padata.xlsx row 166)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
166	133	1	9700.00	2026-11-02	bank_transfer	TXN-2026-0166	HDFC Bank	\N	\N	Payment #166 for Savesh (Padata.xlsx row 167)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
167	157	1	7000.00	2026-11-04	bank_transfer	TXN-2026-0167	HDFC Bank	\N	\N	Payment #167 for Puneeta (Padata.xlsx row 168)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
168	136	1	55000.00	2026-11-01	cash	TXN-2026-0168	\N	\N	\N	Payment #168 for Sonakshi (Padata.xlsx row 169)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
169	140	1	7500.00	2026-09-30	bank_transfer	TXN-2026-0169	HDFC Bank	\N	\N	Payment #169 for Ashwin (Padata.xlsx row 170) [Normalized from raw date: 31-Sep-2026]	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
170	162	1	25000.00	2026-03-31	bank_transfer	TXN-2026-0170	HDFC Bank	\N	\N	Payment #170 for Siddharth (Padata.xlsx row 171)	completed	\N	\N	\N	1	2026-11-04 11:14:22.322779+00
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.permissions (id, role_id, resource, action, created_at) FROM stdin;
1	7	users	manage	2026-11-04 04:41:50.576774+00
2	7	roles	manage	2026-11-04 04:41:50.576774+00
3	7	academic	manage	2026-11-04 04:41:50.576774+00
4	7	students	manage	2026-11-04 04:41:50.576774+00
5	7	attendance	manage	2026-11-04 04:41:50.576774+00
6	7	fees	manage	2026-11-04 04:41:50.576774+00
7	7	examinations	manage	2026-11-04 04:41:50.576774+00
8	7	reports	view	2026-11-04 04:41:50.576774+00
9	7	audit	view	2026-11-04 04:41:50.576774+00
10	8	users	manage	2026-11-04 04:41:50.576774+00
11	8	academic	manage	2026-11-04 04:41:50.576774+00
12	8	students	manage	2026-11-04 04:41:50.576774+00
13	8	attendance	manage	2026-11-04 04:41:50.576774+00
14	8	fees	manage	2026-11-04 04:41:50.576774+00
15	8	examinations	manage	2026-11-04 04:41:50.576774+00
16	8	reports	view	2026-11-04 04:41:50.576774+00
17	9	academic	manage	2026-11-04 04:41:50.576774+00
18	9	students	view	2026-11-04 04:41:50.576774+00
19	9	attendance	manage	2026-11-04 04:41:50.576774+00
20	9	examinations	manage	2026-11-04 04:41:50.576774+00
21	9	reports	view	2026-11-04 04:41:50.576774+00
22	10	fees	manage	2026-11-04 04:41:50.576774+00
23	10	payments	manage	2026-11-04 04:41:50.576774+00
24	10	reports	view	2026-11-04 04:41:50.576774+00
25	10	students	view	2026-11-04 04:41:50.576774+00
26	11	batches	view	2026-11-04 04:41:50.576774+00
27	11	attendance	mark	2026-11-04 04:41:50.576774+00
28	11	examinations	enter_marks	2026-11-04 04:41:50.576774+00
29	11	study_materials	manage	2026-11-04 04:41:50.576774+00
30	11	timetable	view	2026-11-04 04:41:50.576774+00
31	12	students	view	2026-11-04 04:41:50.576774+00
32	12	admissions	create	2026-11-04 04:41:50.576774+00
33	12	attendance	view	2026-11-04 04:41:50.576774+00
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roles (id, name, description, created_at) FROM stdin;
7	superadmin	Super Administrator	2026-11-03 15:17:26.3504+00
8	admin	Administrator	2026-11-03 15:17:26.3504+00
9	principal	Principal	2026-11-03 15:17:26.3504+00
10	accountant	Accountant	2026-11-03 15:17:26.3504+00
11	teacher	Teacher	2026-11-03 15:17:26.3504+00
12	staff	Staff Member	2026-11-03 15:17:26.3504+00
17	student	Student Account	2026-11-04 12:28:48.407712+00
\.


--
-- Data for Name: scholarships; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.scholarships (id, institution_id, name, amount, description, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: standards; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.standards (id, institution_id, name, level, description, is_active, created_at) FROM stdin;
1	2	Standard 1	1	\N	t	2026-11-03 15:17:26.3504+00
2	2	Standard 2	2	\N	t	2026-11-03 15:17:26.3504+00
3	2	Standard 3	3	\N	t	2026-11-03 15:17:26.3504+00
5	2	Standard 5	5	\N	t	2026-11-03 15:17:26.3504+00
6	2	Standard 6	6	\N	t	2026-11-03 15:17:26.3504+00
7	2	Standard 7	7	\N	t	2026-11-03 15:17:26.3504+00
11	2	Standard 11	11	\N	t	2026-11-03 15:17:26.3504+00
12	2	Standard 12	12	\N	t	2026-11-03 15:17:26.3504+00
8	2	Class VIII	8	Class VIII	t	2026-11-03 15:17:26.3504+00
9	2	Class IX	9	Class IX	t	2026-11-03 15:17:26.3504+00
10	2	Class X	10	Class X	t	2026-11-03 15:17:26.3504+00
4	2	Class IV	4	Class IV	t	2026-11-03 15:17:26.3504+00
\.


--
-- Data for Name: student_documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.student_documents (id, student_id, title, document_type, file_url, status, uploaded_at) FROM stdin;
21	129	Rajnees's Aadhaar Card Copy	AADHAAR	/uploads/documents/PA-2024-000001_aadhaar.pdf	verified	2026-11-04 08:43:43.87947+00
22	129	Rajnees's Birth Certificate	BIRTH_CERT	/uploads/documents/PA-2024-000001_birth_cert.pdf	verified	2026-11-04 08:43:43.87947+00
23	129	Rajnees's Previous School Marksheet	MARKSHEET	/uploads/documents/PA-2024-000001_marksheet.pdf	verified	2026-11-04 08:43:43.87947+00
24	129	Rajnees's Address Proof (Electricity Bill)	ADDRESS_PROOF	/uploads/documents/PA-2024-000001_address_proof.pdf	verified	2026-11-04 08:43:43.87947+00
25	129	Rajnees's Passport Photo	PHOTO	/uploads/documents/PA-2024-000001_photo.pdf	verified	2026-11-04 08:43:43.87947+00
26	130	Ayaan's Aadhaar Card Copy	AADHAAR	/uploads/documents/PA-2024-000002_aadhaar.pdf	verified	2026-11-04 08:43:43.87947+00
27	130	Ayaan's Birth Certificate	BIRTH_CERT	/uploads/documents/PA-2024-000002_birth_cert.pdf	verified	2026-11-04 08:43:43.87947+00
28	130	Ayaan's Previous School Marksheet	MARKSHEET	/uploads/documents/PA-2024-000002_marksheet.pdf	verified	2026-11-04 08:43:43.87947+00
29	130	Ayaan's Address Proof (Electricity Bill)	ADDRESS_PROOF	/uploads/documents/PA-2024-000002_address_proof.pdf	verified	2026-11-04 08:43:43.87947+00
30	130	Ayaan's Passport Photo	PHOTO	/uploads/documents/PA-2024-000002_photo.pdf	verified	2026-11-04 08:43:43.87947+00
31	131	Netham's Aadhaar Card Copy	AADHAAR	/uploads/documents/PA-2024-000003_aadhaar.pdf	verified	2026-11-04 08:43:43.87947+00
32	131	Netham's Birth Certificate	BIRTH_CERT	/uploads/documents/PA-2024-000003_birth_cert.pdf	verified	2026-11-04 08:43:43.87947+00
33	131	Netham's Previous School Marksheet	MARKSHEET	/uploads/documents/PA-2024-000003_marksheet.pdf	verified	2026-11-04 08:43:43.87947+00
34	131	Netham's Address Proof (Electricity Bill)	ADDRESS_PROOF	/uploads/documents/PA-2024-000003_address_proof.pdf	verified	2026-11-04 08:43:43.87947+00
35	131	Netham's Passport Photo	PHOTO	/uploads/documents/PA-2024-000003_photo.pdf	verified	2026-11-04 08:43:43.87947+00
36	132	Shreshta's Aadhaar Card Copy	AADHAAR	/uploads/documents/PA-2024-000004_aadhaar.pdf	verified	2026-11-04 08:43:43.87947+00
37	132	Shreshta's Birth Certificate	BIRTH_CERT	/uploads/documents/PA-2024-000004_birth_cert.pdf	verified	2026-11-04 08:43:43.87947+00
38	132	Shreshta's Previous School Marksheet	MARKSHEET	/uploads/documents/PA-2024-000004_marksheet.pdf	verified	2026-11-04 08:43:43.87947+00
39	132	Shreshta's Address Proof (Electricity Bill)	ADDRESS_PROOF	/uploads/documents/PA-2024-000004_address_proof.pdf	verified	2026-11-04 08:43:43.87947+00
40	132	Shreshta's Passport Photo	PHOTO	/uploads/documents/PA-2024-000004_photo.pdf	verified	2026-11-04 08:43:43.87947+00
41	133	Savesh's Aadhaar Card Copy	AADHAAR	/uploads/documents/PA-2024-000005_aadhaar.pdf	verified	2026-11-04 08:43:43.87947+00
42	133	Savesh's Birth Certificate	BIRTH_CERT	/uploads/documents/PA-2024-000005_birth_cert.pdf	verified	2026-11-04 08:43:43.87947+00
43	133	Savesh's Previous School Marksheet	MARKSHEET	/uploads/documents/PA-2024-000005_marksheet.pdf	verified	2026-11-04 08:43:43.87947+00
44	133	Savesh's Address Proof (Electricity Bill)	ADDRESS_PROOF	/uploads/documents/PA-2024-000005_address_proof.pdf	verified	2026-11-04 08:43:43.87947+00
45	133	Savesh's Passport Photo	PHOTO	/uploads/documents/PA-2024-000005_photo.pdf	verified	2026-11-04 08:43:43.87947+00
46	134	Ansh's Aadhaar Card Copy	AADHAAR	/uploads/documents/PA-2024-000006_aadhaar.pdf	verified	2026-11-04 08:43:43.87947+00
47	134	Ansh's Birth Certificate	BIRTH_CERT	/uploads/documents/PA-2024-000006_birth_cert.pdf	verified	2026-11-04 08:43:43.87947+00
48	134	Ansh's Previous School Marksheet	MARKSHEET	/uploads/documents/PA-2024-000006_marksheet.pdf	verified	2026-11-04 08:43:43.87947+00
49	134	Ansh's Address Proof (Electricity Bill)	ADDRESS_PROOF	/uploads/documents/PA-2024-000006_address_proof.pdf	verified	2026-11-04 08:43:43.87947+00
50	134	Ansh's Passport Photo	PHOTO	/uploads/documents/PA-2024-000006_photo.pdf	verified	2026-11-04 08:43:43.87947+00
51	135	Riddhima's Aadhaar Card Copy	AADHAAR	/uploads/documents/PA-2024-000007_aadhaar.pdf	verified	2026-11-04 08:43:43.87947+00
52	135	Riddhima's Birth Certificate	BIRTH_CERT	/uploads/documents/PA-2024-000007_birth_cert.pdf	verified	2026-11-04 08:43:43.87947+00
53	135	Riddhima's Previous School Marksheet	MARKSHEET	/uploads/documents/PA-2024-000007_marksheet.pdf	verified	2026-11-04 08:43:43.87947+00
54	135	Riddhima's Address Proof (Electricity Bill)	ADDRESS_PROOF	/uploads/documents/PA-2024-000007_address_proof.pdf	verified	2026-11-04 08:43:43.87947+00
55	135	Riddhima's Passport Photo	PHOTO	/uploads/documents/PA-2024-000007_photo.pdf	verified	2026-11-04 08:43:43.87947+00
56	136	Sonakshi's Aadhaar Card Copy	AADHAAR	/uploads/documents/PA-2024-000008_aadhaar.pdf	verified	2026-11-04 08:43:43.87947+00
57	136	Sonakshi's Birth Certificate	BIRTH_CERT	/uploads/documents/PA-2024-000008_birth_cert.pdf	verified	2026-11-04 08:43:43.87947+00
58	136	Sonakshi's Previous School Marksheet	MARKSHEET	/uploads/documents/PA-2024-000008_marksheet.pdf	verified	2026-11-04 08:43:43.87947+00
59	136	Sonakshi's Address Proof (Electricity Bill)	ADDRESS_PROOF	/uploads/documents/PA-2024-000008_address_proof.pdf	verified	2026-11-04 08:43:43.87947+00
60	136	Sonakshi's Passport Photo	PHOTO	/uploads/documents/PA-2024-000008_photo.pdf	verified	2026-11-04 08:43:43.87947+00
61	137	Raudrita's Aadhaar Card Copy	AADHAAR	/uploads/documents/PA-2024-000009_aadhaar.pdf	verified	2026-11-04 08:43:43.87947+00
62	137	Raudrita's Birth Certificate	BIRTH_CERT	/uploads/documents/PA-2024-000009_birth_cert.pdf	verified	2026-11-04 08:43:43.87947+00
63	137	Raudrita's Previous School Marksheet	MARKSHEET	/uploads/documents/PA-2024-000009_marksheet.pdf	verified	2026-11-04 08:43:43.87947+00
64	137	Raudrita's Address Proof (Electricity Bill)	ADDRESS_PROOF	/uploads/documents/PA-2024-000009_address_proof.pdf	verified	2026-11-04 08:43:43.87947+00
65	137	Raudrita's Passport Photo	PHOTO	/uploads/documents/PA-2024-000009_photo.pdf	verified	2026-11-04 08:43:43.87947+00
66	138	Samruddhi's Aadhaar Card Copy	AADHAAR	/uploads/documents/PA-2024-000010_aadhaar.pdf	verified	2026-11-04 08:43:43.87947+00
67	138	Samruddhi's Birth Certificate	BIRTH_CERT	/uploads/documents/PA-2024-000010_birth_cert.pdf	verified	2026-11-04 08:43:43.87947+00
68	138	Samruddhi's Previous School Marksheet	MARKSHEET	/uploads/documents/PA-2024-000010_marksheet.pdf	verified	2026-11-04 08:43:43.87947+00
69	138	Samruddhi's Address Proof (Electricity Bill)	ADDRESS_PROOF	/uploads/documents/PA-2024-000010_address_proof.pdf	verified	2026-11-04 08:43:43.87947+00
70	138	Samruddhi's Passport Photo	PHOTO	/uploads/documents/PA-2024-000010_photo.pdf	verified	2026-11-04 08:43:43.87947+00
71	139	Aman's Aadhaar Card Copy	AADHAAR	/uploads/documents/PA-2024-000011_aadhaar.pdf	verified	2026-11-04 08:43:43.87947+00
72	139	Aman's Birth Certificate	BIRTH_CERT	/uploads/documents/PA-2024-000011_birth_cert.pdf	verified	2026-11-04 08:43:43.87947+00
73	139	Aman's Previous School Marksheet	MARKSHEET	/uploads/documents/PA-2024-000011_marksheet.pdf	verified	2026-11-04 08:43:43.87947+00
74	139	Aman's Address Proof (Electricity Bill)	ADDRESS_PROOF	/uploads/documents/PA-2024-000011_address_proof.pdf	verified	2026-11-04 08:43:43.87947+00
75	139	Aman's Passport Photo	PHOTO	/uploads/documents/PA-2024-000011_photo.pdf	verified	2026-11-04 08:43:43.87947+00
76	140	Ashwin's Aadhaar Card Copy	AADHAAR	/uploads/documents/PA-2024-000012_aadhaar.pdf	verified	2026-11-04 08:43:43.87947+00
77	140	Ashwin's Birth Certificate	BIRTH_CERT	/uploads/documents/PA-2024-000012_birth_cert.pdf	verified	2026-11-04 08:43:43.87947+00
78	140	Ashwin's Previous School Marksheet	MARKSHEET	/uploads/documents/PA-2024-000012_marksheet.pdf	verified	2026-11-04 08:43:43.87947+00
79	140	Ashwin's Address Proof (Electricity Bill)	ADDRESS_PROOF	/uploads/documents/PA-2024-000012_address_proof.pdf	verified	2026-11-04 08:43:43.87947+00
80	140	Ashwin's Passport Photo	PHOTO	/uploads/documents/PA-2024-000012_photo.pdf	verified	2026-11-04 08:43:43.87947+00
81	141	Keshwa's Aadhaar Card Copy	AADHAAR	/uploads/documents/PA-2024-000013_aadhaar.pdf	verified	2026-11-04 08:43:43.87947+00
82	141	Keshwa's Birth Certificate	BIRTH_CERT	/uploads/documents/PA-2024-000013_birth_cert.pdf	verified	2026-11-04 08:43:43.87947+00
83	141	Keshwa's Previous School Marksheet	MARKSHEET	/uploads/documents/PA-2024-000013_marksheet.pdf	verified	2026-11-04 08:43:43.87947+00
84	141	Keshwa's Address Proof (Electricity Bill)	ADDRESS_PROOF	/uploads/documents/PA-2024-000013_address_proof.pdf	verified	2026-11-04 08:43:43.87947+00
85	141	Keshwa's Passport Photo	PHOTO	/uploads/documents/PA-2024-000013_photo.pdf	verified	2026-11-04 08:43:43.87947+00
86	142	Satnam's Aadhaar Card Copy	AADHAAR	/uploads/documents/PA-2024-000014_aadhaar.pdf	verified	2026-11-04 08:43:43.87947+00
87	142	Satnam's Birth Certificate	BIRTH_CERT	/uploads/documents/PA-2024-000014_birth_cert.pdf	verified	2026-11-04 08:43:43.87947+00
88	142	Satnam's Previous School Marksheet	MARKSHEET	/uploads/documents/PA-2024-000014_marksheet.pdf	verified	2026-11-04 08:43:43.87947+00
89	142	Satnam's Address Proof (Electricity Bill)	ADDRESS_PROOF	/uploads/documents/PA-2024-000014_address_proof.pdf	verified	2026-11-04 08:43:43.87947+00
90	142	Satnam's Passport Photo	PHOTO	/uploads/documents/PA-2024-000014_photo.pdf	verified	2026-11-04 08:43:43.87947+00
91	143	Samud's Aadhaar Card Copy	AADHAAR	/uploads/documents/PA-2024-000015_aadhaar.pdf	verified	2026-11-04 08:43:43.87947+00
92	143	Samud's Birth Certificate	BIRTH_CERT	/uploads/documents/PA-2024-000015_birth_cert.pdf	verified	2026-11-04 08:43:43.87947+00
93	143	Samud's Previous School Marksheet	MARKSHEET	/uploads/documents/PA-2024-000015_marksheet.pdf	verified	2026-11-04 08:43:43.87947+00
94	143	Samud's Address Proof (Electricity Bill)	ADDRESS_PROOF	/uploads/documents/PA-2024-000015_address_proof.pdf	verified	2026-11-04 08:43:43.87947+00
95	143	Samud's Passport Photo	PHOTO	/uploads/documents/PA-2024-000015_photo.pdf	verified	2026-11-04 08:43:43.87947+00
96	144	Simran's Aadhaar Card Copy	AADHAAR	/uploads/documents/PA-2024-000016_aadhaar.pdf	verified	2026-11-04 08:43:43.87947+00
97	144	Simran's Birth Certificate	BIRTH_CERT	/uploads/documents/PA-2024-000016_birth_cert.pdf	verified	2026-11-04 08:43:43.87947+00
98	144	Simran's Previous School Marksheet	MARKSHEET	/uploads/documents/PA-2024-000016_marksheet.pdf	verified	2026-11-04 08:43:43.87947+00
99	144	Simran's Address Proof (Electricity Bill)	ADDRESS_PROOF	/uploads/documents/PA-2024-000016_address_proof.pdf	verified	2026-11-04 08:43:43.87947+00
100	144	Simran's Passport Photo	PHOTO	/uploads/documents/PA-2024-000016_photo.pdf	verified	2026-11-04 08:43:43.87947+00
101	145	Kashish's Aadhaar Card Copy	AADHAAR	/uploads/documents/PA-2024-000017_aadhaar.pdf	verified	2026-11-04 08:43:43.87947+00
102	145	Kashish's Birth Certificate	BIRTH_CERT	/uploads/documents/PA-2024-000017_birth_cert.pdf	verified	2026-11-04 08:43:43.87947+00
103	145	Kashish's Previous School Marksheet	MARKSHEET	/uploads/documents/PA-2024-000017_marksheet.pdf	verified	2026-11-04 08:43:43.87947+00
104	145	Kashish's Address Proof (Electricity Bill)	ADDRESS_PROOF	/uploads/documents/PA-2024-000017_address_proof.pdf	verified	2026-11-04 08:43:43.87947+00
105	145	Kashish's Passport Photo	PHOTO	/uploads/documents/PA-2024-000017_photo.pdf	verified	2026-11-04 08:43:43.87947+00
106	146	Vedant's Aadhaar Card Copy	AADHAAR	/uploads/documents/PA-2024-000018_aadhaar.pdf	verified	2026-11-04 08:43:43.87947+00
107	146	Vedant's Birth Certificate	BIRTH_CERT	/uploads/documents/PA-2024-000018_birth_cert.pdf	verified	2026-11-04 08:43:43.87947+00
108	146	Vedant's Previous School Marksheet	MARKSHEET	/uploads/documents/PA-2024-000018_marksheet.pdf	verified	2026-11-04 08:43:43.87947+00
109	146	Vedant's Address Proof (Electricity Bill)	ADDRESS_PROOF	/uploads/documents/PA-2024-000018_address_proof.pdf	verified	2026-11-04 08:43:43.87947+00
110	146	Vedant's Passport Photo	PHOTO	/uploads/documents/PA-2024-000018_photo.pdf	verified	2026-11-04 08:43:43.87947+00
111	147	Khushi's Aadhaar Card Copy	AADHAAR	/uploads/documents/PA-2024-000019_aadhaar.pdf	verified	2026-11-04 08:43:43.87947+00
112	147	Khushi's Birth Certificate	BIRTH_CERT	/uploads/documents/PA-2024-000019_birth_cert.pdf	verified	2026-11-04 08:43:43.87947+00
113	147	Khushi's Previous School Marksheet	MARKSHEET	/uploads/documents/PA-2024-000019_marksheet.pdf	verified	2026-11-04 08:43:43.87947+00
114	147	Khushi's Address Proof (Electricity Bill)	ADDRESS_PROOF	/uploads/documents/PA-2024-000019_address_proof.pdf	verified	2026-11-04 08:43:43.87947+00
115	147	Khushi's Passport Photo	PHOTO	/uploads/documents/PA-2024-000019_photo.pdf	verified	2026-11-04 08:43:43.87947+00
116	148	Mahek's Aadhaar Card Copy	AADHAAR	/uploads/documents/PA-2024-000020_aadhaar.pdf	verified	2026-11-04 08:43:43.87947+00
117	148	Mahek's Birth Certificate	BIRTH_CERT	/uploads/documents/PA-2024-000020_birth_cert.pdf	verified	2026-11-04 08:43:43.87947+00
118	148	Mahek's Previous School Marksheet	MARKSHEET	/uploads/documents/PA-2024-000020_marksheet.pdf	verified	2026-11-04 08:43:43.87947+00
119	148	Mahek's Address Proof (Electricity Bill)	ADDRESS_PROOF	/uploads/documents/PA-2024-000020_address_proof.pdf	verified	2026-11-04 08:43:43.87947+00
120	148	Mahek's Passport Photo	PHOTO	/uploads/documents/PA-2024-000020_photo.pdf	verified	2026-11-04 08:43:43.87947+00
121	149	Johan's Aadhaar Card Copy	AADHAAR	/uploads/documents/PA-2024-000021_aadhaar.pdf	verified	2026-11-04 08:43:43.87947+00
122	149	Johan's Birth Certificate	BIRTH_CERT	/uploads/documents/PA-2024-000021_birth_cert.pdf	verified	2026-11-04 08:43:43.87947+00
123	149	Johan's Previous School Marksheet	MARKSHEET	/uploads/documents/PA-2024-000021_marksheet.pdf	verified	2026-11-04 08:43:43.87947+00
124	149	Johan's Address Proof (Electricity Bill)	ADDRESS_PROOF	/uploads/documents/PA-2024-000021_address_proof.pdf	verified	2026-11-04 08:43:43.87947+00
125	149	Johan's Passport Photo	PHOTO	/uploads/documents/PA-2024-000021_photo.pdf	verified	2026-11-04 08:43:43.87947+00
126	150	Avner's Aadhaar Card Copy	AADHAAR	/uploads/documents/PA-2024-000022_aadhaar.pdf	verified	2026-11-04 08:43:43.87947+00
127	150	Avner's Birth Certificate	BIRTH_CERT	/uploads/documents/PA-2024-000022_birth_cert.pdf	verified	2026-11-04 08:43:43.87947+00
128	150	Avner's Previous School Marksheet	MARKSHEET	/uploads/documents/PA-2024-000022_marksheet.pdf	verified	2026-11-04 08:43:43.87947+00
129	150	Avner's Address Proof (Electricity Bill)	ADDRESS_PROOF	/uploads/documents/PA-2024-000022_address_proof.pdf	verified	2026-11-04 08:43:43.87947+00
130	150	Avner's Passport Photo	PHOTO	/uploads/documents/PA-2024-000022_photo.pdf	verified	2026-11-04 08:43:43.87947+00
131	151	Apika's Aadhaar Card Copy	AADHAAR	/uploads/documents/PA-2024-000023_aadhaar.pdf	verified	2026-11-04 08:43:43.87947+00
132	151	Apika's Birth Certificate	BIRTH_CERT	/uploads/documents/PA-2024-000023_birth_cert.pdf	verified	2026-11-04 08:43:43.87947+00
133	151	Apika's Previous School Marksheet	MARKSHEET	/uploads/documents/PA-2024-000023_marksheet.pdf	verified	2026-11-04 08:43:43.87947+00
134	151	Apika's Address Proof (Electricity Bill)	ADDRESS_PROOF	/uploads/documents/PA-2024-000023_address_proof.pdf	verified	2026-11-04 08:43:43.87947+00
135	151	Apika's Passport Photo	PHOTO	/uploads/documents/PA-2024-000023_photo.pdf	verified	2026-11-04 08:43:43.87947+00
136	152	Shrawya's Aadhaar Card Copy	AADHAAR	/uploads/documents/PA-2024-000024_aadhaar.pdf	verified	2026-11-04 08:43:43.87947+00
137	152	Shrawya's Birth Certificate	BIRTH_CERT	/uploads/documents/PA-2024-000024_birth_cert.pdf	verified	2026-11-04 08:43:43.87947+00
138	152	Shrawya's Previous School Marksheet	MARKSHEET	/uploads/documents/PA-2024-000024_marksheet.pdf	verified	2026-11-04 08:43:43.87947+00
139	152	Shrawya's Address Proof (Electricity Bill)	ADDRESS_PROOF	/uploads/documents/PA-2024-000024_address_proof.pdf	verified	2026-11-04 08:43:43.87947+00
140	152	Shrawya's Passport Photo	PHOTO	/uploads/documents/PA-2024-000024_photo.pdf	verified	2026-11-04 08:43:43.87947+00
141	153	Afton's Aadhaar Card Copy	AADHAAR	/uploads/documents/PA-2024-000025_aadhaar.pdf	verified	2026-11-04 08:43:43.87947+00
142	153	Afton's Birth Certificate	BIRTH_CERT	/uploads/documents/PA-2024-000025_birth_cert.pdf	verified	2026-11-04 08:43:43.87947+00
143	153	Afton's Previous School Marksheet	MARKSHEET	/uploads/documents/PA-2024-000025_marksheet.pdf	verified	2026-11-04 08:43:43.87947+00
144	153	Afton's Address Proof (Electricity Bill)	ADDRESS_PROOF	/uploads/documents/PA-2024-000025_address_proof.pdf	verified	2026-11-04 08:43:43.87947+00
145	153	Afton's Passport Photo	PHOTO	/uploads/documents/PA-2024-000025_photo.pdf	verified	2026-11-04 08:43:43.87947+00
146	154	Maahi's Aadhaar Card Copy	AADHAAR	/uploads/documents/PA-2024-000026_aadhaar.pdf	verified	2026-11-04 08:43:43.87947+00
147	154	Maahi's Birth Certificate	BIRTH_CERT	/uploads/documents/PA-2024-000026_birth_cert.pdf	verified	2026-11-04 08:43:43.87947+00
148	154	Maahi's Previous School Marksheet	MARKSHEET	/uploads/documents/PA-2024-000026_marksheet.pdf	verified	2026-11-04 08:43:43.87947+00
149	154	Maahi's Address Proof (Electricity Bill)	ADDRESS_PROOF	/uploads/documents/PA-2024-000026_address_proof.pdf	verified	2026-11-04 08:43:43.87947+00
150	154	Maahi's Passport Photo	PHOTO	/uploads/documents/PA-2024-000026_photo.pdf	verified	2026-11-04 08:43:43.87947+00
151	155	Aadya's Aadhaar Card Copy	AADHAAR	/uploads/documents/PA-2024-000027_aadhaar.pdf	verified	2026-11-04 08:43:43.87947+00
152	155	Aadya's Birth Certificate	BIRTH_CERT	/uploads/documents/PA-2024-000027_birth_cert.pdf	verified	2026-11-04 08:43:43.87947+00
153	155	Aadya's Previous School Marksheet	MARKSHEET	/uploads/documents/PA-2024-000027_marksheet.pdf	verified	2026-11-04 08:43:43.87947+00
154	155	Aadya's Address Proof (Electricity Bill)	ADDRESS_PROOF	/uploads/documents/PA-2024-000027_address_proof.pdf	verified	2026-11-04 08:43:43.87947+00
155	155	Aadya's Passport Photo	PHOTO	/uploads/documents/PA-2024-000027_photo.pdf	verified	2026-11-04 08:43:43.87947+00
156	156	Rida's Aadhaar Card Copy	AADHAAR	/uploads/documents/PA-2024-000028_aadhaar.pdf	verified	2026-11-04 08:43:43.87947+00
157	156	Rida's Birth Certificate	BIRTH_CERT	/uploads/documents/PA-2024-000028_birth_cert.pdf	verified	2026-11-04 08:43:43.87947+00
158	156	Rida's Previous School Marksheet	MARKSHEET	/uploads/documents/PA-2024-000028_marksheet.pdf	verified	2026-11-04 08:43:43.87947+00
159	156	Rida's Address Proof (Electricity Bill)	ADDRESS_PROOF	/uploads/documents/PA-2024-000028_address_proof.pdf	verified	2026-11-04 08:43:43.87947+00
160	156	Rida's Passport Photo	PHOTO	/uploads/documents/PA-2024-000028_photo.pdf	verified	2026-11-04 08:43:43.87947+00
161	157	Puneeta's Aadhaar Card Copy	AADHAAR	/uploads/documents/PA-2024-000029_aadhaar.pdf	verified	2026-11-04 08:43:43.87947+00
162	157	Puneeta's Birth Certificate	BIRTH_CERT	/uploads/documents/PA-2024-000029_birth_cert.pdf	verified	2026-11-04 08:43:43.87947+00
163	157	Puneeta's Previous School Marksheet	MARKSHEET	/uploads/documents/PA-2024-000029_marksheet.pdf	verified	2026-11-04 08:43:43.87947+00
164	157	Puneeta's Address Proof (Electricity Bill)	ADDRESS_PROOF	/uploads/documents/PA-2024-000029_address_proof.pdf	verified	2026-11-04 08:43:43.87947+00
165	157	Puneeta's Passport Photo	PHOTO	/uploads/documents/PA-2024-000029_photo.pdf	verified	2026-11-04 08:43:43.87947+00
166	158	Aliya's Aadhaar Card Copy	AADHAAR	/uploads/documents/PA-2024-000030_aadhaar.pdf	verified	2026-11-04 08:43:43.87947+00
167	158	Aliya's Birth Certificate	BIRTH_CERT	/uploads/documents/PA-2024-000030_birth_cert.pdf	verified	2026-11-04 08:43:43.87947+00
168	158	Aliya's Previous School Marksheet	MARKSHEET	/uploads/documents/PA-2024-000030_marksheet.pdf	verified	2026-11-04 08:43:43.87947+00
169	158	Aliya's Address Proof (Electricity Bill)	ADDRESS_PROOF	/uploads/documents/PA-2024-000030_address_proof.pdf	verified	2026-11-04 08:43:43.87947+00
170	158	Aliya's Passport Photo	PHOTO	/uploads/documents/PA-2024-000030_photo.pdf	verified	2026-11-04 08:43:43.87947+00
171	159	Siddhant's Aadhaar Card Copy	AADHAAR	/uploads/documents/PA-2024-000031_aadhaar.pdf	verified	2026-11-04 08:43:43.87947+00
172	159	Siddhant's Birth Certificate	BIRTH_CERT	/uploads/documents/PA-2024-000031_birth_cert.pdf	verified	2026-11-04 08:43:43.87947+00
173	159	Siddhant's Previous School Marksheet	MARKSHEET	/uploads/documents/PA-2024-000031_marksheet.pdf	verified	2026-11-04 08:43:43.87947+00
174	159	Siddhant's Address Proof (Electricity Bill)	ADDRESS_PROOF	/uploads/documents/PA-2024-000031_address_proof.pdf	verified	2026-11-04 08:43:43.87947+00
175	159	Siddhant's Passport Photo	PHOTO	/uploads/documents/PA-2024-000031_photo.pdf	verified	2026-11-04 08:43:43.87947+00
176	160	Shaurya's Aadhaar Card Copy	AADHAAR	/uploads/documents/PA-2024-000032_aadhaar.pdf	verified	2026-11-04 08:43:43.87947+00
177	160	Shaurya's Birth Certificate	BIRTH_CERT	/uploads/documents/PA-2024-000032_birth_cert.pdf	verified	2026-11-04 08:43:43.87947+00
178	160	Shaurya's Previous School Marksheet	MARKSHEET	/uploads/documents/PA-2024-000032_marksheet.pdf	verified	2026-11-04 08:43:43.87947+00
179	160	Shaurya's Address Proof (Electricity Bill)	ADDRESS_PROOF	/uploads/documents/PA-2024-000032_address_proof.pdf	verified	2026-11-04 08:43:43.87947+00
180	160	Shaurya's Passport Photo	PHOTO	/uploads/documents/PA-2024-000032_photo.pdf	verified	2026-11-04 08:43:43.87947+00
181	161	Chehek's Aadhaar Card Copy	AADHAAR	/uploads/documents/PA-2024-000033_aadhaar.pdf	verified	2026-11-04 08:43:43.87947+00
182	161	Chehek's Birth Certificate	BIRTH_CERT	/uploads/documents/PA-2024-000033_birth_cert.pdf	verified	2026-11-04 08:43:43.87947+00
183	161	Chehek's Previous School Marksheet	MARKSHEET	/uploads/documents/PA-2024-000033_marksheet.pdf	verified	2026-11-04 08:43:43.87947+00
184	161	Chehek's Address Proof (Electricity Bill)	ADDRESS_PROOF	/uploads/documents/PA-2024-000033_address_proof.pdf	verified	2026-11-04 08:43:43.87947+00
185	161	Chehek's Passport Photo	PHOTO	/uploads/documents/PA-2024-000033_photo.pdf	verified	2026-11-04 08:43:43.87947+00
186	162	Siddharth's Aadhaar Card Copy	AADHAAR	/uploads/documents/PA-2024-000034_aadhaar.pdf	verified	2026-11-04 08:43:43.87947+00
187	162	Siddharth's Birth Certificate	BIRTH_CERT	/uploads/documents/PA-2024-000034_birth_cert.pdf	verified	2026-11-04 08:43:43.87947+00
188	162	Siddharth's Previous School Marksheet	MARKSHEET	/uploads/documents/PA-2024-000034_marksheet.pdf	verified	2026-11-04 08:43:43.87947+00
189	162	Siddharth's Address Proof (Electricity Bill)	ADDRESS_PROOF	/uploads/documents/PA-2024-000034_address_proof.pdf	verified	2026-11-04 08:43:43.87947+00
190	162	Siddharth's Passport Photo	PHOTO	/uploads/documents/PA-2024-000034_photo.pdf	verified	2026-11-04 08:43:43.87947+00
191	163	Aditya's Aadhaar Card Copy	AADHAAR	/uploads/documents/PA-2024-000035_aadhaar.pdf	verified	2026-11-04 08:43:43.87947+00
192	163	Aditya's Birth Certificate	BIRTH_CERT	/uploads/documents/PA-2024-000035_birth_cert.pdf	verified	2026-11-04 08:43:43.87947+00
193	163	Aditya's Previous School Marksheet	MARKSHEET	/uploads/documents/PA-2024-000035_marksheet.pdf	verified	2026-11-04 08:43:43.87947+00
194	163	Aditya's Address Proof (Electricity Bill)	ADDRESS_PROOF	/uploads/documents/PA-2024-000035_address_proof.pdf	verified	2026-11-04 08:43:43.87947+00
195	163	Aditya's Passport Photo	PHOTO	/uploads/documents/PA-2024-000035_photo.pdf	verified	2026-11-04 08:43:43.87947+00
196	164	Shriya's Aadhaar Card Copy	AADHAAR	/uploads/documents/PA-2024-000036_aadhaar.pdf	verified	2026-11-04 08:43:43.87947+00
197	164	Shriya's Birth Certificate	BIRTH_CERT	/uploads/documents/PA-2024-000036_birth_cert.pdf	verified	2026-11-04 08:43:43.87947+00
198	164	Shriya's Previous School Marksheet	MARKSHEET	/uploads/documents/PA-2024-000036_marksheet.pdf	verified	2026-11-04 08:43:43.87947+00
199	164	Shriya's Address Proof (Electricity Bill)	ADDRESS_PROOF	/uploads/documents/PA-2024-000036_address_proof.pdf	verified	2026-11-04 08:43:43.87947+00
200	164	Shriya's Passport Photo	PHOTO	/uploads/documents/PA-2024-000036_photo.pdf	verified	2026-11-04 08:43:43.87947+00
201	165	Sukhmeet's Aadhaar Card Copy	AADHAAR	/uploads/documents/PA-2024-000037_aadhaar.pdf	verified	2026-11-04 08:43:43.87947+00
202	165	Sukhmeet's Birth Certificate	BIRTH_CERT	/uploads/documents/PA-2024-000037_birth_cert.pdf	verified	2026-11-04 08:43:43.87947+00
203	165	Sukhmeet's Previous School Marksheet	MARKSHEET	/uploads/documents/PA-2024-000037_marksheet.pdf	verified	2026-11-04 08:43:43.87947+00
204	165	Sukhmeet's Address Proof (Electricity Bill)	ADDRESS_PROOF	/uploads/documents/PA-2024-000037_address_proof.pdf	verified	2026-11-04 08:43:43.87947+00
205	165	Sukhmeet's Passport Photo	PHOTO	/uploads/documents/PA-2024-000037_photo.pdf	verified	2026-11-04 08:43:43.87947+00
206	166	Sushmya's Aadhaar Card Copy	AADHAAR	/uploads/documents/PA-2024-000038_aadhaar.pdf	verified	2026-11-04 08:43:43.87947+00
207	166	Sushmya's Birth Certificate	BIRTH_CERT	/uploads/documents/PA-2024-000038_birth_cert.pdf	verified	2026-11-04 08:43:43.87947+00
208	166	Sushmya's Previous School Marksheet	MARKSHEET	/uploads/documents/PA-2024-000038_marksheet.pdf	verified	2026-11-04 08:43:43.87947+00
209	166	Sushmya's Address Proof (Electricity Bill)	ADDRESS_PROOF	/uploads/documents/PA-2024-000038_address_proof.pdf	verified	2026-11-04 08:43:43.87947+00
210	166	Sushmya's Passport Photo	PHOTO	/uploads/documents/PA-2024-000038_photo.pdf	verified	2026-11-04 08:43:43.87947+00
211	167	Aaradhya's Aadhaar Card Copy	AADHAAR	/uploads/documents/PA-2024-000039_aadhaar.pdf	verified	2026-11-04 08:43:43.87947+00
212	167	Aaradhya's Birth Certificate	BIRTH_CERT	/uploads/documents/PA-2024-000039_birth_cert.pdf	verified	2026-11-04 08:43:43.87947+00
213	167	Aaradhya's Previous School Marksheet	MARKSHEET	/uploads/documents/PA-2024-000039_marksheet.pdf	verified	2026-11-04 08:43:43.87947+00
214	167	Aaradhya's Address Proof (Electricity Bill)	ADDRESS_PROOF	/uploads/documents/PA-2024-000039_address_proof.pdf	verified	2026-11-04 08:43:43.87947+00
215	167	Aaradhya's Passport Photo	PHOTO	/uploads/documents/PA-2024-000039_photo.pdf	verified	2026-11-04 08:43:43.87947+00
\.


--
-- Data for Name: student_enrollments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.student_enrollments (id, student_id, academic_year_id, standard_id, division_id, roll_number, enrollment_date, status, remarks, created_at) FROM stdin;
156	156	1	4	7	ICSEIX-28	2024-04-01	active	Imported from Book1.xlsx (ICSE 9th)	2026-11-04 03:50:41.678614+00
163	163	1	9	28	SSCIX-35	2024-04-01	active	Imported from Book1.xlsx (SSC IX)	2026-11-04 03:50:41.678614+00
167	167	1	9	28	SSCIX-39	2024-04-01	active	Imported from Book1.xlsx (SSC IX)	2026-11-04 03:50:41.678614+00
155	155	1	4	7	ICSEIX-27	2024-04-01	active	Imported from Book1.xlsx (ICSE 9th)	2026-11-04 03:50:41.678614+00
129	129	1	10	25	ICSEX-01	2024-04-01	active	Imported from Book1.xlsx (ICSE X)	2026-11-04 03:50:41.678614+00
130	130	1	10	25	ICSEX-02	2024-04-01	active	Imported from Book1.xlsx (ICSE X)	2026-11-04 03:50:41.678614+00
131	131	1	10	25	ICSEX-03	2024-04-01	active	Imported from Book1.xlsx (ICSE X)	2026-11-04 03:50:41.678614+00
132	132	1	10	25	ICSEX-04	2024-04-01	active	Imported from Book1.xlsx (ICSE X)	2026-11-04 03:50:41.678614+00
133	133	1	10	25	ICSEX-05	2024-04-01	active	Imported from Book1.xlsx (ICSE X)	2026-11-04 03:50:41.678614+00
134	134	1	10	25	ICSEX-06	2024-04-01	active	Imported from Book1.xlsx (ICSE X)	2026-11-04 03:50:41.678614+00
135	135	1	10	25	ICSEX-07	2024-04-01	active	Imported from Book1.xlsx (ICSE X)	2026-11-04 03:50:41.678614+00
136	136	1	10	25	ICSEX-08	2024-04-01	active	Imported from Book1.xlsx (ICSE X)	2026-11-04 03:50:41.678614+00
138	138	1	10	26	CBSEX-10	2024-04-01	active	Imported from Book1.xlsx (CBSE X)	2026-11-04 03:50:41.678614+00
139	139	1	10	26	CBSEX-11	2024-04-01	active	Imported from Book1.xlsx (CBSE X)	2026-11-04 03:50:41.678614+00
140	140	1	10	26	CBSEX-12	2024-04-01	active	Imported from Book1.xlsx (CBSE X)	2026-11-04 03:50:41.678614+00
141	141	1	10	26	CBSEX-13	2024-04-01	active	Imported from Book1.xlsx (CBSE X)	2026-11-04 03:50:41.678614+00
137	137	1	10	26	CBSEX-09	2024-04-01	active	Transferred to A. Reason: Performance stream promotion	2026-11-04 03:50:41.678614+00
157	157	1	8	29	ICSEVIII-29	2024-04-01	active	Imported from Book1.xlsx (ICSE VIII)	2026-11-04 03:50:41.678614+00
158	158	1	8	29	ICSEVIII-30	2024-04-01	active	Imported from Book1.xlsx (ICSE VIII)	2026-11-04 03:50:41.678614+00
159	159	1	8	29	ICSEVIII-31	2024-04-01	active	Imported from Book1.xlsx (ICSE VIII)	2026-11-04 03:50:41.678614+00
160	160	1	8	29	ICSEVIII-32	2024-04-01	active	Imported from Book1.xlsx (ICSE VIII)	2026-11-04 03:50:41.678614+00
161	161	1	8	29	ICSEVIII-33	2024-04-01	active	Imported from Book1.xlsx (ICSE VIII)	2026-11-04 03:50:41.678614+00
162	162	1	9	28	SSCIX-34	2024-04-01	active	Imported from Book1.xlsx (SSC IX)	2026-11-04 03:50:41.678614+00
164	164	1	9	28	SSCIX-36	2024-04-01	active	Imported from Book1.xlsx (SSC IX)	2026-11-04 03:50:41.678614+00
165	165	1	9	28	SSCIX-37	2024-04-01	active	Imported from Book1.xlsx (SSC IX)	2026-11-04 03:50:41.678614+00
166	166	1	9	28	SSCIX-38	2024-04-01	active	Imported from Book1.xlsx (SSC IX)	2026-11-04 03:50:41.678614+00
142	142	1	4	7	ICSEIX-14	2024-04-01	active	Imported from Book1.xlsx (ICSE 9th)	2026-11-04 03:50:41.678614+00
143	143	1	4	7	ICSEIX-15	2024-04-01	active	Imported from Book1.xlsx (ICSE 9th)	2026-11-04 03:50:41.678614+00
144	144	1	4	7	ICSEIX-16	2024-04-01	active	Imported from Book1.xlsx (ICSE 9th)	2026-11-04 03:50:41.678614+00
145	145	1	4	7	ICSEIX-17	2024-04-01	active	Imported from Book1.xlsx (ICSE 9th)	2026-11-04 03:50:41.678614+00
146	146	1	4	7	ICSEIX-18	2024-04-01	active	Imported from Book1.xlsx (ICSE 9th)	2026-11-04 03:50:41.678614+00
147	147	1	4	7	ICSEIX-19	2024-04-01	active	Imported from Book1.xlsx (ICSE 9th)	2026-11-04 03:50:41.678614+00
148	148	1	4	7	ICSEIX-20	2024-04-01	active	Imported from Book1.xlsx (ICSE 9th)	2026-11-04 03:50:41.678614+00
149	149	1	4	7	ICSEIX-21	2024-04-01	active	Imported from Book1.xlsx (ICSE 9th)	2026-11-04 03:50:41.678614+00
150	150	1	4	7	ICSEIX-22	2024-04-01	active	Imported from Book1.xlsx (ICSE 9th)	2026-11-04 03:50:41.678614+00
151	151	1	4	7	ICSEIX-23	2024-04-01	active	Imported from Book1.xlsx (ICSE 9th)	2026-11-04 03:50:41.678614+00
152	152	1	4	7	ICSEIX-24	2024-04-01	active	Imported from Book1.xlsx (ICSE 9th)	2026-11-04 03:50:41.678614+00
153	153	1	4	7	ICSEIX-25	2024-04-01	active	Imported from Book1.xlsx (ICSE 9th)	2026-11-04 03:50:41.678614+00
154	154	1	4	7	ICSEIX-26	2024-04-01	active	Imported from Book1.xlsx (ICSE 9th)	2026-11-04 03:50:41.678614+00
\.


--
-- Data for Name: student_fee_assignments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.student_fee_assignments (id, student_id, fee_structure_id, academic_year_id, discount_id, scholarship_id, custom_amount, concession_amount, remarks, created_at) FROM stdin;
1	156	1	1	\N	\N	30000.00	0.00	Authoritative fee assignment for Rida from Padata.xlsx	2026-11-04 11:14:22.322779+00
2	163	2	1	\N	\N	45000.00	0.00	Authoritative fee assignment for Aditya from Padata.xlsx	2026-11-04 11:14:22.322779+00
3	155	3	1	\N	\N	80000.00	0.00	Authoritative fee assignment for Aadya from Padata.xlsx	2026-11-04 11:14:22.322779+00
4	137	4	1	\N	\N	85000.00	0.00	Authoritative fee assignment for Raudrita from Padata.xlsx	2026-11-04 11:14:22.322779+00
5	129	5	1	\N	\N	95000.00	0.00	Authoritative fee assignment for Rajnees from Padata.xlsx	2026-11-04 11:14:22.322779+00
6	130	6	1	\N	\N	95000.00	0.00	Authoritative fee assignment for Ayaan from Padata.xlsx	2026-11-04 11:14:22.322779+00
7	131	7	1	\N	\N	90000.00	0.00	Authoritative fee assignment for Netham from Padata.xlsx	2026-11-04 11:14:22.322779+00
8	132	8	1	\N	\N	60000.00	0.00	Authoritative fee assignment for Shreshta from Padata.xlsx	2026-11-04 11:14:22.322779+00
9	133	9	1	\N	\N	95000.00	0.00	Authoritative fee assignment for Savesh from Padata.xlsx	2026-11-04 11:14:22.322779+00
10	134	10	1	\N	\N	85000.00	0.00	Authoritative fee assignment for Ansh from Padata.xlsx	2026-11-04 11:14:22.322779+00
11	135	11	1	\N	\N	95000.00	0.00	Authoritative fee assignment for Riddhima from Padata.xlsx	2026-11-04 11:14:22.322779+00
12	136	12	1	\N	\N	80000.00	0.00	Authoritative fee assignment for Sonakshi from Padata.xlsx	2026-11-04 11:14:22.322779+00
13	138	13	1	\N	\N	60000.00	0.00	Authoritative fee assignment for Samruddhi from Padata.xlsx	2026-11-04 11:14:22.322779+00
14	139	14	1	\N	\N	85000.00	0.00	Authoritative fee assignment for Aman from Padata.xlsx	2026-11-04 11:14:22.322779+00
15	140	15	1	\N	\N	80000.00	0.00	Authoritative fee assignment for Ashwin from Padata.xlsx	2026-11-04 11:14:22.322779+00
16	141	16	1	\N	\N	85000.00	0.00	Authoritative fee assignment for Keshwa from Padata.xlsx	2026-11-04 11:14:22.322779+00
17	157	17	1	\N	\N	90000.00	0.00	Authoritative fee assignment for Puneeta from Padata.xlsx	2026-11-04 11:14:22.322779+00
18	158	18	1	\N	\N	75000.00	0.00	Authoritative fee assignment for Aliya from Padata.xlsx	2026-11-04 11:14:22.322779+00
19	159	19	1	\N	\N	75000.00	0.00	Authoritative fee assignment for Siddhant from Padata.xlsx	2026-11-04 11:14:22.322779+00
20	161	20	1	\N	\N	75000.00	0.00	Authoritative fee assignment for Chehek from Padata.xlsx	2026-11-04 11:14:22.322779+00
21	162	21	1	\N	\N	50000.00	0.00	Authoritative fee assignment for Siddharth from Padata.xlsx	2026-11-04 11:14:22.322779+00
22	164	22	1	\N	\N	50000.00	0.00	Authoritative fee assignment for Shriya from Padata.xlsx	2026-11-04 11:14:22.322779+00
23	165	23	1	\N	\N	50000.00	0.00	Authoritative fee assignment for Sukhmeet from Padata.xlsx	2026-11-04 11:14:22.322779+00
24	142	24	1	\N	\N	80000.00	0.00	Authoritative fee assignment for Satnam from Padata.xlsx	2026-11-04 11:14:22.322779+00
25	143	25	1	\N	\N	85000.00	0.00	Authoritative fee assignment for Samud from Padata.xlsx	2026-11-04 11:14:22.322779+00
26	144	26	1	\N	\N	85000.00	0.00	Authoritative fee assignment for Simran from Padata.xlsx	2026-11-04 11:14:22.322779+00
27	145	27	1	\N	\N	85000.00	0.00	Authoritative fee assignment for Kashish from Padata.xlsx	2026-11-04 11:14:22.322779+00
28	146	28	1	\N	\N	85000.00	0.00	Authoritative fee assignment for Vedant from Padata.xlsx	2026-11-04 11:14:22.322779+00
29	147	29	1	\N	\N	85000.00	0.00	Authoritative fee assignment for Khushi from Padata.xlsx	2026-11-04 11:14:22.322779+00
30	148	30	1	\N	\N	85000.00	0.00	Authoritative fee assignment for Mahek from Padata.xlsx	2026-11-04 11:14:22.322779+00
31	149	31	1	\N	\N	85000.00	0.00	Authoritative fee assignment for Johan from Padata.xlsx	2026-11-04 11:14:22.322779+00
32	150	32	1	\N	\N	80000.00	0.00	Authoritative fee assignment for Avner from Padata.xlsx	2026-11-04 11:14:22.322779+00
33	151	33	1	\N	\N	85000.00	0.00	Authoritative fee assignment for Apika from Padata.xlsx	2026-11-04 11:14:22.322779+00
34	152	34	1	\N	\N	65000.00	0.00	Authoritative fee assignment for Shrawya from Padata.xlsx	2026-11-04 11:14:22.322779+00
35	153	35	1	\N	\N	85000.00	0.00	Authoritative fee assignment for Afton from Padata.xlsx	2026-11-04 11:14:22.322779+00
36	154	36	1	\N	\N	70000.00	0.00	Authoritative fee assignment for Maahi from Padata.xlsx	2026-11-04 11:14:22.322779+00
\.


--
-- Data for Name: students; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.students (id, institution_id, admission_number, first_name, last_name, middle_name, date_of_birth, gender, blood_group, nationality, religion, caste, aadhar_number, photo_url, address, city, state, pincode, phone, email, admission_date, is_active, created_at, updated_at) FROM stdin;
129	2	PA-2024-000001	Rajnees	Sharma	\N	2010-01-01	male	O+	Indian	\N	\N	481239841000	\N	Flat 101, Building A, Dadar West, Near Shivaji Park	Mumbai	Maharashtra	400028	+91-9820014411	rajnees.sharma129@example.com	2024-04-01	t	2026-11-04 03:50:41.678614+00	2026-11-04 08:43:43.87947+00
130	2	PA-2024-000002	Ayaan	Verma	\N	2010-02-02	female	A+	Indian	\N	\N	481239841001	\N	Flat 102, Building A, Bandra West, Linking Road	Mumbai	Maharashtra	400050	+91-9820024411	ayaan.verma130@example.com	2024-04-01	t	2026-11-04 03:50:41.678614+00	2026-11-04 08:43:43.87947+00
131	2	PA-2024-000003	Netham	Patil	\N	2010-03-03	male	B+	Indian	\N	\N	481239841002	\N	Flat 103, Building A, Andheri East, Chakala	Mumbai	Maharashtra	400069	+91-9820034411	netham.patil131@example.com	2024-04-01	t	2026-11-04 03:50:41.678614+00	2026-11-04 08:43:43.87947+00
132	2	PA-2024-000004	Shreshta	Deshmukh	\N	2010-04-04	female	AB+	Indian	\N	\N	481239841003	\N	Flat 104, Building A, Thane West, Naupada	Thane	Maharashtra	400602	+91-9820044411	shreshta.deshmukh132@example.com	2024-04-01	t	2026-11-04 03:50:41.678614+00	2026-11-04 08:43:43.87947+00
133	2	PA-2024-000005	Savesh	Kulkarni	\N	2010-05-05	male	O-	Indian	\N	\N	481239841004	\N	Flat 105, Building A, Vashi, Sector 17	Navi Mumbai	Maharashtra	400703	+91-9820054411	savesh.kulkarni133@example.com	2024-04-01	t	2026-11-04 03:50:41.678614+00	2026-11-04 08:43:43.87947+00
134	2	PA-2024-000006	Ansh	Joshi	\N	2010-06-06	female	O+	Indian	\N	\N	481239841005	\N	Flat 106, Building A, Borivali West, Shimpoli Road	Mumbai	Maharashtra	400092	+91-9820064411	ansh.joshi134@example.com	2024-04-01	t	2026-11-04 03:50:41.678614+00	2026-11-04 08:43:43.87947+00
135	2	PA-2024-000007	Riddhima	Mehta	\N	2010-07-07	male	A+	Indian	\N	\N	481239841006	\N	Flat 107, Building A, Chembur, Diamond Garden	Mumbai	Maharashtra	400071	+91-9820074411	riddhima.mehta135@example.com	2024-04-01	t	2026-11-04 03:50:41.678614+00	2026-11-04 08:43:43.87947+00
136	2	PA-2024-000008	Sonakshi	Shah	\N	2010-08-08	female	B+	Indian	\N	\N	481239841007	\N	Flat 108, Building A, Ghatkopar East, Tilak Road	Mumbai	Maharashtra	400077	+91-9820084411	sonakshi.shah136@example.com	2024-04-01	t	2026-11-04 03:50:41.678614+00	2026-11-04 08:43:43.87947+00
137	2	PA-2024-000009	Raudrita	Pawar	\N	2010-09-09	male	AB+	Indian	\N	\N	481239841008	\N	Flat 109, Building A, Dadar West, Near Shivaji Park	Mumbai	Maharashtra	400028	+91-9820094411	raudrita.pawar137@example.com	2024-04-01	t	2026-11-04 03:50:41.678614+00	2026-11-04 08:43:43.87947+00
138	2	PA-2024-000010	Samruddhi	Bhide	\N	2010-10-10	female	O-	Indian	\N	\N	481239841009	\N	Flat 110, Building A, Bandra West, Linking Road	Mumbai	Maharashtra	400050	+91-9820104411	samruddhi.bhide138@example.com	2024-04-01	t	2026-11-04 03:50:41.678614+00	2026-11-04 08:43:43.87947+00
139	2	PA-2024-000011	Aman	Chavan	\N	2010-11-11	male	O+	Indian	\N	\N	481239841010	\N	Flat 111, Building A, Andheri East, Chakala	Mumbai	Maharashtra	400069	+91-9820114411	aman.chavan139@example.com	2024-04-01	t	2026-11-04 03:50:41.678614+00	2026-11-04 08:43:43.87947+00
140	2	PA-2024-000012	Ashwin	Tambe	\N	2010-12-12	female	A+	Indian	\N	\N	481239841011	\N	Flat 112, Building A, Thane West, Naupada	Thane	Maharashtra	400602	+91-9820124411	ashwin.tambe140@example.com	2024-04-01	t	2026-11-04 03:50:41.678614+00	2026-11-04 08:43:43.87947+00
141	2	PA-2024-000013	Keshwa	Mistry	\N	2010-01-13	male	B+	Indian	\N	\N	481239841012	\N	Flat 113, Building A, Vashi, Sector 17	Navi Mumbai	Maharashtra	400703	+91-9820134411	keshwa.mistry141@example.com	2024-04-01	t	2026-11-04 03:50:41.678614+00	2026-11-04 08:43:43.87947+00
142	2	PA-2024-000014	Satnam	Bhatia	\N	2016-02-14	female	AB+	Indian	\N	\N	481239841013	\N	Flat 114, Building A, Borivali West, Shimpoli Road	Mumbai	Maharashtra	400092	+91-9820144411	satnam.bhatia142@example.com	2024-04-01	t	2026-11-04 03:50:41.678614+00	2026-11-04 08:43:43.87947+00
143	2	PA-2024-000015	Samud	Kapoor	\N	2016-03-15	male	O-	Indian	\N	\N	481239841014	\N	Flat 115, Building A, Chembur, Diamond Garden	Mumbai	Maharashtra	400071	+91-9820154411	samud.kapoor143@example.com	2024-04-01	t	2026-11-04 03:50:41.678614+00	2026-11-04 08:43:43.87947+00
144	2	PA-2024-000016	Simran	Malhotra	\N	2016-04-16	female	O+	Indian	\N	\N	481239841015	\N	Flat 116, Building A, Ghatkopar East, Tilak Road	Mumbai	Maharashtra	400077	+91-9820164411	simran.malhotra144@example.com	2024-04-01	t	2026-11-04 03:50:41.678614+00	2026-11-04 08:43:43.87947+00
145	2	PA-2024-000017	Kashish	Sawant	\N	2016-05-17	male	A+	Indian	\N	\N	481239841016	\N	Flat 117, Building A, Dadar West, Near Shivaji Park	Mumbai	Maharashtra	400028	+91-9820174411	kashish.sawant145@example.com	2024-04-01	t	2026-11-04 03:50:41.678614+00	2026-11-04 08:43:43.87947+00
146	2	PA-2024-000018	Vedant	Gokhale	\N	2016-06-18	female	B+	Indian	\N	\N	481239841017	\N	Flat 118, Building A, Bandra West, Linking Road	Mumbai	Maharashtra	400050	+91-9820184411	vedant.gokhale146@example.com	2024-04-01	t	2026-11-04 03:50:41.678614+00	2026-11-04 08:43:43.87947+00
147	2	PA-2024-000019	Khushi	Gadgil	\N	2016-07-19	male	AB+	Indian	\N	\N	481239841018	\N	Flat 119, Building A, Andheri East, Chakala	Mumbai	Maharashtra	400069	+91-9820194411	khushi.gadgil147@example.com	2024-04-01	t	2026-11-04 03:50:41.678614+00	2026-11-04 08:43:43.87947+00
148	2	PA-2024-000020	Mahek	Nair	\N	2016-08-20	female	O-	Indian	\N	\N	481239841019	\N	Flat 120, Building A, Thane West, Naupada	Thane	Maharashtra	400602	+91-9820204411	mahek.nair148@example.com	2024-04-01	t	2026-11-04 03:50:41.678614+00	2026-11-04 08:43:43.87947+00
149	2	PA-2024-000021	Johan	Iyer	\N	2016-09-21	male	O+	Indian	\N	\N	481239841020	\N	Flat 121, Building A, Vashi, Sector 17	Navi Mumbai	Maharashtra	400703	+91-9820214411	johan.iyer149@example.com	2024-04-01	t	2026-11-04 03:50:41.678614+00	2026-11-04 08:43:43.87947+00
150	2	PA-2024-000022	Avner	Rao	\N	2016-10-22	female	A+	Indian	\N	\N	481239841021	\N	Flat 122, Building A, Borivali West, Shimpoli Road	Mumbai	Maharashtra	400092	+91-9820224411	avner.rao150@example.com	2024-04-01	t	2026-11-04 03:50:41.678614+00	2026-11-04 08:43:43.87947+00
151	2	PA-2024-000023	Apika	Shetty	\N	2016-11-23	male	B+	Indian	\N	\N	481239841022	\N	Flat 123, Building A, Chembur, Diamond Garden	Mumbai	Maharashtra	400071	+91-9820234411	apika.shetty151@example.com	2024-04-01	t	2026-11-04 03:50:41.678614+00	2026-11-04 08:43:43.87947+00
152	2	PA-2024-000024	Shrawya	Kamath	\N	2016-12-24	female	AB+	Indian	\N	\N	481239841023	\N	Flat 124, Building A, Ghatkopar East, Tilak Road	Mumbai	Maharashtra	400077	+91-9820244411	shrawya.kamath152@example.com	2024-04-01	t	2026-11-04 03:50:41.678614+00	2026-11-04 08:43:43.87947+00
153	2	PA-2024-000025	Afton	Sharma	\N	2016-01-25	male	O-	Indian	\N	\N	481239841024	\N	Flat 125, Building A, Dadar West, Near Shivaji Park	Mumbai	Maharashtra	400028	+91-9820254411	afton.sharma153@example.com	2024-04-01	t	2026-11-04 03:50:41.678614+00	2026-11-04 08:43:43.87947+00
154	2	PA-2024-000026	Maahi	Verma	\N	2016-02-26	female	O+	Indian	\N	\N	481239841025	\N	Flat 126, Building A, Bandra West, Linking Road	Mumbai	Maharashtra	400050	+91-9820264411	maahi.verma154@example.com	2024-04-01	t	2026-11-04 03:50:41.678614+00	2026-11-04 08:43:43.87947+00
155	2	PA-2024-000027	Aadya	Patil	\N	2016-03-27	male	A+	Indian	\N	\N	481239841026	\N	Flat 127, Building A, Andheri East, Chakala	Mumbai	Maharashtra	400069	+91-9820274411	aadya.patil155@example.com	2024-04-01	t	2026-11-04 03:50:41.678614+00	2026-11-04 08:43:43.87947+00
156	2	PA-2024-000028	Rida	Deshmukh	\N	2016-04-01	female	B+	Indian	\N	\N	481239841027	\N	Flat 128, Building A, Thane West, Naupada	Thane	Maharashtra	400602	+91-9820284411	rida.deshmukh156@example.com	2024-04-01	t	2026-11-04 03:50:41.678614+00	2026-11-04 08:43:43.87947+00
157	2	PA-2024-000029	Puneeta	Kulkarni	\N	2016-05-02	male	AB+	Indian	\N	\N	481239841028	\N	Flat 129, Building A, Vashi, Sector 17	Navi Mumbai	Maharashtra	400703	+91-9820294411	puneeta.kulkarni157@example.com	2024-04-01	t	2026-11-04 03:50:41.678614+00	2026-11-04 08:43:43.87947+00
158	2	PA-2024-000030	Aliya	Joshi	\N	2016-06-03	female	O-	Indian	\N	\N	481239841029	\N	Flat 130, Building A, Borivali West, Shimpoli Road	Mumbai	Maharashtra	400092	+91-9820304411	aliya.joshi158@example.com	2024-04-01	t	2026-11-04 03:50:41.678614+00	2026-11-04 08:43:43.87947+00
159	2	PA-2024-000031	Siddhant	Mehta	\N	2016-07-04	male	O+	Indian	\N	\N	481239841030	\N	Flat 131, Building A, Chembur, Diamond Garden	Mumbai	Maharashtra	400071	+91-9820314411	siddhant.mehta159@example.com	2024-04-01	t	2026-11-04 03:50:41.678614+00	2026-11-04 08:43:43.87947+00
160	2	PA-2024-000032	Shaurya	Shah	\N	2016-08-05	female	A+	Indian	\N	\N	481239841031	\N	Flat 132, Building A, Ghatkopar East, Tilak Road	Mumbai	Maharashtra	400077	+91-9820324411	shaurya.shah160@example.com	2024-04-01	t	2026-11-04 03:50:41.678614+00	2026-11-04 08:43:43.87947+00
161	2	PA-2024-000033	Chehek	Pawar	\N	2016-09-06	male	B+	Indian	\N	\N	481239841032	\N	Flat 133, Building A, Dadar West, Near Shivaji Park	Mumbai	Maharashtra	400028	+91-9820334411	chehek.pawar161@example.com	2024-04-01	t	2026-11-04 03:50:41.678614+00	2026-11-04 08:43:43.87947+00
162	2	PA-2024-000034	Siddharth	Bhide	\N	2016-10-07	female	AB+	Indian	\N	\N	481239841033	\N	Flat 134, Building A, Bandra West, Linking Road	Mumbai	Maharashtra	400050	+91-9820344411	siddharth.bhide162@example.com	2024-04-01	t	2026-11-04 03:50:41.678614+00	2026-11-04 08:43:43.87947+00
163	2	PA-2024-000035	Aditya	Chavan	\N	2016-11-08	male	O-	Indian	\N	\N	481239841034	\N	Flat 135, Building A, Andheri East, Chakala	Mumbai	Maharashtra	400069	+91-9820354411	aditya.chavan163@example.com	2024-04-01	t	2026-11-04 03:50:41.678614+00	2026-11-04 08:43:43.87947+00
164	2	PA-2024-000036	Shriya	Tambe	\N	2016-12-09	female	O+	Indian	\N	\N	481239841035	\N	Flat 136, Building A, Thane West, Naupada	Thane	Maharashtra	400602	+91-9820364411	shriya.tambe164@example.com	2024-04-01	t	2026-11-04 03:50:41.678614+00	2026-11-04 08:43:43.87947+00
165	2	PA-2024-000037	Sukhmeet	Mistry	\N	2016-01-10	male	A+	Indian	\N	\N	481239841036	\N	Flat 137, Building A, Vashi, Sector 17	Navi Mumbai	Maharashtra	400703	+91-9820374411	sukhmeet.mistry165@example.com	2024-04-01	t	2026-11-04 03:50:41.678614+00	2026-11-04 08:43:43.87947+00
166	2	PA-2024-000038	Sushmya	Bhatia	\N	2016-02-11	female	B+	Indian	\N	\N	481239841037	\N	Flat 138, Building A, Borivali West, Shimpoli Road	Mumbai	Maharashtra	400092	+91-9820384411	sushmya.bhatia166@example.com	2024-04-01	t	2026-11-04 03:50:41.678614+00	2026-11-04 08:43:43.87947+00
167	2	PA-2024-000039	Aaradhya	Kapoor	\N	2016-03-12	male	AB+	Indian	\N	\N	481239841038	\N	Flat 139, Building A, Chembur, Diamond Garden	Mumbai	Maharashtra	400071	+91-9820394411	aaradhya.kapoor167@example.com	2024-04-01	t	2026-11-04 03:50:41.678614+00	2026-11-04 08:43:43.87947+00
\.


--
-- Data for Name: study_materials; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.study_materials (id, institution_id, standard_id, subject_id, division_id, title, description, file_type, file_url, file_size_bytes, created_at) FROM stdin;
13	2	10	1	\N	Class X Mathematics - Complete Formula Booklet & Theorems	Comprehensive coaching notes, concept maps, and practice questions for Mathematics.	Formula Sheet	/materials/math10_formulas.pdf	1850000	2026-11-04 14:26:35.769607+00
14	2	10	1	\N	Class X Quadratic Equations & Arithmetic Progressions Solved Bank	Comprehensive coaching notes, concept maps, and practice questions for Mathematics.	Question Bank	/materials/math10_quadratics_ap.pdf	3200000	2026-11-04 14:26:35.769607+00
15	2	10	2	\N	Class X Physics - Light, Electricity & Magnetism Numerical Handbook	Comprehensive coaching notes, concept maps, and practice questions for Physics.	Notes	/materials/phys10_numerical_bank.pdf	2750000	2026-11-04 14:26:35.769607+00
16	2	10	3	\N	Class X Chemistry - Chemical Reactions & Periodic Classification Chart	Comprehensive coaching notes, concept maps, and practice questions for Chemistry.	Revision	/materials/chem10_periodic_chart.pdf	1950000	2026-11-04 14:26:35.769607+00
17	2	9	7	\N	Class IX Polynomials & Coordinate Geometry Practice Problems	Comprehensive coaching notes, concept maps, and practice questions for Mathematics.	Assignment	/materials/math9_polynomials.pdf	1400000	2026-11-04 14:26:35.769607+00
18	2	9	8	\N	Class IX Laws of Motion & Gravitation Derivations & Solutions	Comprehensive coaching notes, concept maps, and practice questions for Physics.	Notes	/materials/phys9_motion_gravitation.pdf	2200000	2026-11-04 14:26:35.769607+00
19	2	8	13	\N	Class VIII Rational Numbers & Algebraic Identities Workbook	Comprehensive coaching notes, concept maps, and practice questions for Mathematics.	Workbook	/materials/math8_algebra_workbook.pdf	1150000	2026-11-04 14:26:35.769607+00
20	2	8	14	\N	Class VIII Force & Pressure Experimental Concepts & Diagrams	Comprehensive coaching notes, concept maps, and practice questions for Science.	Notes	/materials/sci8_force_pressure.pdf	1650000	2026-11-04 14:26:35.769607+00
21	2	4	37	\N	Class IV Primary Mathematics - Fractions & Decimals Illustrated Guide	Comprehensive coaching notes, concept maps, and practice questions for Mathematics.	Worksheet	/materials/math4_fractions_guide.pdf	890000	2026-11-04 14:26:35.769607+00
22	2	4	38	\N	Class IV Environmental Science - Living Things & Habitats Notes	Comprehensive coaching notes, concept maps, and practice questions for Science.	Notes	/materials/sci4_living_things.pdf	940000	2026-11-04 14:26:35.769607+00
\.


--
-- Data for Name: subjects; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.subjects (id, standard_id, name, code, max_marks, pass_marks, is_optional, is_active, created_at) FROM stdin;
1	10	Mathematics	MATH-10	100	35	f	t	2026-11-03 20:01:02.869063+00
2	10	Physics	PHYS-10	100	35	f	t	2026-11-03 20:01:02.869063+00
3	10	Chemistry	CHEM-10	100	35	f	t	2026-11-03 20:01:02.869063+00
4	10	Biology	BIO-10	100	35	f	t	2026-11-03 20:01:02.869063+00
5	10	English Language & Lit	ENG-10	100	35	f	t	2026-11-03 20:01:02.869063+00
6	10	Social Science	SST-10	100	35	f	t	2026-11-03 20:01:02.869063+00
7	9	Mathematics	MATH-9	100	35	f	t	2026-11-03 20:01:02.869063+00
8	9	Physics	PHYS-9	100	35	f	t	2026-11-03 20:01:02.869063+00
9	9	Chemistry	CHEM-9	100	35	f	t	2026-11-03 20:01:02.869063+00
10	9	Biology	BIO-9	100	35	f	t	2026-11-03 20:01:02.869063+00
11	9	English Language	ENG-9	100	35	f	t	2026-11-03 20:01:02.869063+00
12	9	Social Science	SST-9	100	35	f	t	2026-11-03 20:01:02.869063+00
13	8	Mathematics	MATH-8	100	35	f	t	2026-11-03 20:01:02.869063+00
14	8	Science	SCI-8	100	35	f	t	2026-11-03 20:01:02.869063+00
15	8	English	ENG-8	100	35	f	t	2026-11-03 20:01:02.869063+00
16	8	Social Studies	SST-8	100	35	f	t	2026-11-03 20:01:02.869063+00
37	4	Mathematics	MATH-4	100	35	f	t	2026-11-04 07:49:16.02485+00
38	4	Science	SCI-4	100	35	f	t	2026-11-04 07:49:16.02485+00
39	4	English	ENG-4	100	35	f	t	2026-11-04 07:49:16.02485+00
40	4	Social Studies	SST-4	100	35	f	t	2026-11-04 07:49:16.02485+00
\.


--
-- Data for Name: timetable_entries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.timetable_entries (id, division_id, subject_id, day_of_week, start_time, end_time, room_number, is_active, created_at) FROM stdin;
1	25	1	Monday	16:00	17:30	Room 101	t	2026-11-03 20:01:02.869063+00
2	25	2	Monday	17:45	19:15	Room 101	t	2026-11-03 20:01:02.869063+00
3	25	3	Wednesday	16:00	17:30	Room 102	t	2026-11-03 20:01:02.869063+00
4	25	4	Wednesday	17:45	19:15	Room 102	t	2026-11-03 20:01:02.869063+00
5	25	5	Friday	16:00	17:30	Room 101	t	2026-11-03 20:01:02.869063+00
6	25	6	Friday	17:45	19:15	Room 101	t	2026-11-03 20:01:02.869063+00
7	25	1	Saturday	09:00	11:00	Hall A	t	2026-11-03 20:01:02.869063+00
8	25	2	Saturday	11:15	13:00	Lab 1	t	2026-11-03 20:01:02.869063+00
9	26	1	Monday	16:00	17:30	Room 101	t	2026-11-03 20:01:02.869063+00
10	26	2	Monday	17:45	19:15	Room 101	t	2026-11-03 20:01:02.869063+00
11	26	3	Wednesday	16:00	17:30	Room 102	t	2026-11-03 20:01:02.869063+00
12	26	4	Wednesday	17:45	19:15	Room 102	t	2026-11-03 20:01:02.869063+00
13	26	5	Friday	16:00	17:30	Room 101	t	2026-11-03 20:01:02.869063+00
14	26	6	Friday	17:45	19:15	Room 101	t	2026-11-03 20:01:02.869063+00
15	26	1	Saturday	09:00	11:00	Hall A	t	2026-11-03 20:01:02.869063+00
16	26	2	Saturday	11:15	13:00	Lab 1	t	2026-11-03 20:01:02.869063+00
25	29	13	Monday	16:00	17:30	Room 101	t	2026-11-03 20:01:02.869063+00
26	29	13	Monday	17:45	19:15	Room 101	t	2026-11-03 20:01:02.869063+00
27	29	13	Wednesday	16:00	17:30	Room 102	t	2026-11-03 20:01:02.869063+00
28	29	13	Wednesday	17:45	19:15	Room 102	t	2026-11-03 20:01:02.869063+00
29	29	13	Friday	16:00	17:30	Room 101	t	2026-11-03 20:01:02.869063+00
30	29	13	Friday	17:45	19:15	Room 101	t	2026-11-03 20:01:02.869063+00
31	29	13	Saturday	09:00	11:00	Hall A	t	2026-11-03 20:01:02.869063+00
32	29	13	Saturday	11:15	13:00	Lab 1	t	2026-11-03 20:01:02.869063+00
33	28	1	Monday	16:00	17:30	Room 101	t	2026-11-03 20:01:02.869063+00
34	28	2	Monday	17:45	19:15	Room 101	t	2026-11-03 20:01:02.869063+00
35	28	3	Wednesday	16:00	17:30	Room 102	t	2026-11-03 20:01:02.869063+00
36	28	4	Wednesday	17:45	19:15	Room 102	t	2026-11-03 20:01:02.869063+00
37	28	5	Friday	16:00	17:30	Room 101	t	2026-11-03 20:01:02.869063+00
38	28	6	Friday	17:45	19:15	Room 101	t	2026-11-03 20:01:02.869063+00
39	28	1	Saturday	09:00	11:00	Hall A	t	2026-11-03 20:01:02.869063+00
40	28	2	Saturday	11:15	13:00	Lab 1	t	2026-11-03 20:01:02.869063+00
119	7	37	Monday	09:15	10:15	Room 1	t	2026-11-04 07:49:44.163088+00
120	7	38	Monday	10:15	11:15	Room 1	t	2026-11-04 07:49:44.163088+00
121	7	39	Wednesday	09:15	10:15	Room 1	t	2026-11-04 07:49:44.163088+00
122	7	40	Wednesday	10:15	11:15	Room 1	t	2026-11-04 07:49:44.163088+00
123	7	37	Friday	09:15	10:15	Room 1	t	2026-11-04 07:49:44.163088+00
124	7	38	Friday	10:15	11:15	Room 1	t	2026-11-04 07:49:44.163088+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, institution_id, username, email, hashed_password, first_name, last_name, phone, role, role_id, is_active, last_login, created_at, updated_at, student_id, invitation_status, invitation_sent_at, scope_type, scope_id, staff_code, designation) FROM stdin;
2	2	accountant	accountant@prashantacademy.edu.in	$2b$12$3Ev8e.oFbCHso4ekpPf5T.RND2/2CPxfuOfauPCzqNeQktXopcYuG	Rajesh	Sharma	+91-9870011122	accountant	10	t	\N	2026-11-03 15:17:26.3504+00	2026-11-04 08:43:43.87947+00	\N	accepted	\N	institute	\N	ACC-001	Head Accountant
121	2	rahul.desai	rahul.desai@prashantacademy.in	$2b$12$XMyA3BYsAR..x/F4iX1CMuRhwC8waObUEc/gvVbOK6iUS7E6Wddc6	Rahul	Desai	+91-9870021122	teacher	11	t	\N	2026-11-04 03:56:25.608406+00	2026-11-04 10:17:06.092167+00	\N	accepted	\N	institute	\N	TCH-001	Senior Mathematics Faculty
122	2	priya.mehta	priya.mehta@prashantacademy.in	$2b$12$1HqkVanv8/j0YRVAAf8WxeonS1o8F6TdC.M9aIZIVcc5nNFZp59/y	Priya	Mehta	+91-9870031122	teacher	11	t	\N	2026-11-04 03:56:25.608406+00	2026-11-04 10:17:06.092167+00	\N	accepted	\N	institute	\N	TCH-002	Senior Science Faculty
123	2	amit.patil	amit.patil@prashantacademy.in	$2b$12$FpbyfvRRObCf/Jqih33tROAw9G5M4on0EmoLHMxJEBy9PlFBekQeG	Amit	Patil	+91-9870041122	teacher	11	t	\N	2026-11-04 03:56:25.608406+00	2026-11-04 10:17:06.092167+00	\N	accepted	\N	institute	\N	TCH-003	Faculty - Social Studies
124	2	neha.kulkarni	neha.kulkarni@prashantacademy.in	$2b$12$ikFtirWPGPQHMwHih1kxROCHG0Z/M2u8vrbbZcQSA9gU036fZxVlO	Neha	Kulkarni	+91-9870051122	teacher	11	t	\N	2026-11-04 03:56:25.608406+00	2026-11-04 10:17:06.092167+00	\N	accepted	\N	institute	\N	TCH-004	Faculty - Test Series Coordinator
91	2	samruddhi10	samruddhi10@prashantacademy.in	$2b$12$WSTj2/keeDBUEEFSg4H4yuVuU/SNDghJhIgeZKbGr0M5pVLKjqYsG	Samruddhi	Student	\N	student	17	t	\N	2026-11-04 03:50:41.678614+00	2026-11-04 10:17:06.092167+00	138	accepted	\N	institute	\N	\N	\N
92	2	aman11	aman11@prashantacademy.in	$2b$12$X/4IiS7l4pccDbFW6QMsx.wvZsQmfkgnBr//x0/w2Hyvwm3qCFRXS	Aman	Student	\N	student	17	t	\N	2026-11-04 03:50:41.678614+00	2026-11-04 10:17:06.092167+00	139	accepted	\N	institute	\N	\N	\N
93	2	ashwin12	ashwin12@prashantacademy.in	$2b$12$g8A55/YSa4szS7RWW9zuo..Ae1QeVtj9m54HJbBeeZQDxx4BT6.pK	Ashwin	Student	\N	student	17	t	\N	2026-11-04 03:50:41.678614+00	2026-11-04 10:17:06.092167+00	140	accepted	\N	institute	\N	\N	\N
94	2	keshwa13	keshwa13@prashantacademy.in	$2b$12$lcW16sRyXECjYFHyY4qaxeemf5w2dP5lRM.ew1JAtgf7ZQaIxIkjG	Keshwa	Student	\N	student	17	t	\N	2026-11-04 03:50:41.678614+00	2026-11-04 10:17:06.092167+00	141	accepted	\N	institute	\N	\N	\N
95	2	satnam14	satnam14@prashantacademy.in	$2b$12$LZpdX7pbYFfNKjnnfUJmc.1u9vXUHklb/bJ4MUOg9dfILTji/gfba	Satnam	Student	\N	student	17	t	\N	2026-11-04 03:50:41.678614+00	2026-11-04 10:17:06.092167+00	142	accepted	\N	institute	\N	\N	\N
96	2	samud15	samud15@prashantacademy.in	$2b$12$tEoMbrPPT8YlmxRYBGM9VuMqPrhYjE8EO7gG5tqwau0b3L2KkHMPK	Samud	Student	\N	student	17	t	\N	2026-11-04 03:50:41.678614+00	2026-11-04 10:17:06.092167+00	143	accepted	\N	institute	\N	\N	\N
97	2	simran16	simran16@prashantacademy.in	$2b$12$fvqDXgc.WogeWKuZ5Xtdj.3fXuojrFVcb5Ym60Wg/TcWN7O83DMMy	Simran	Student	\N	student	17	t	\N	2026-11-04 03:50:41.678614+00	2026-11-04 10:17:06.092167+00	144	accepted	\N	institute	\N	\N	\N
98	2	kashish17	kashish17@prashantacademy.in	$2b$12$OGdBhcHlkIekfFvJBmoyPuJlsZzfyv3Yt5.KnAnOxd7exmG7hT5Ei	Kashish	Student	\N	student	17	t	\N	2026-11-04 03:50:41.678614+00	2026-11-04 10:17:06.092167+00	145	accepted	\N	institute	\N	\N	\N
99	2	vedant18	vedant18@prashantacademy.in	$2b$12$bTNakM6iYWaE/K/2.3FB6ecpUmiMmbbkhTTXczi/xX7sKoN0fy2dC	Vedant	Student	\N	student	17	t	\N	2026-11-04 03:50:41.678614+00	2026-11-04 10:17:06.092167+00	146	accepted	\N	institute	\N	\N	\N
100	2	khushi19	khushi19@prashantacademy.in	$2b$12$kvfO161X./vPAFYPLAcBu.mg8hGmolNoLkArFB2GhgE/v8e.oNVwa	Khushi	Student	\N	student	17	t	\N	2026-11-04 03:50:41.678614+00	2026-11-04 10:17:06.092167+00	147	accepted	\N	institute	\N	\N	\N
101	2	mahek20	mahek20@prashantacademy.in	$2b$12$MIcClwOG.YpXInvVh4kSNOgHxXEp6S7lC49G1s/qlBICGMhnPXQBa	Mahek	Student	\N	student	17	t	\N	2026-11-04 03:50:41.678614+00	2026-11-04 10:17:06.092167+00	148	accepted	\N	institute	\N	\N	\N
102	2	johan21	johan21@prashantacademy.in	$2b$12$5OGpuosOaDH2QHGHTolCDOmOn6w9aAqe0ccrS9HDOJ1PdAv1uYyPi	Johan	Student	\N	student	17	t	\N	2026-11-04 03:50:41.678614+00	2026-11-04 10:17:06.092167+00	149	accepted	\N	institute	\N	\N	\N
103	2	avner22	avner22@prashantacademy.in	$2b$12$0YKkmLibzJllftLaFOa5cu3LQtLgxU5uQzFYSdx4tK6D0a9Red/nO	Avner	Student	\N	student	17	t	\N	2026-11-04 03:50:41.678614+00	2026-11-04 10:17:06.092167+00	150	accepted	\N	institute	\N	\N	\N
104	2	apika23	apika23@prashantacademy.in	$2b$12$ErYbdmQ9T4EaKjKmMALrGeNztiK.N2epEWf.eEdBlqeogpJmyRAEG	Apika	Student	\N	student	17	t	\N	2026-11-04 03:50:41.678614+00	2026-11-04 10:17:06.092167+00	151	accepted	\N	institute	\N	\N	\N
105	2	shrawya24	shrawya24@prashantacademy.in	$2b$12$JbZ7oukU9sJvtbPtRYdqf.cVRhzQ1Y/WJ2MUZUOCfHyna/bAfUyla	Shrawya	Student	\N	student	17	t	\N	2026-11-04 03:50:41.678614+00	2026-11-04 10:17:06.092167+00	152	accepted	\N	institute	\N	\N	\N
82	2	rajnees1	rajnees1@prashantacademy.in	$2b$12$xJXecPeiigu7sNK1YXI5uuOihylgW1gc8iL1Dqewb2XUUlZscXjEy	Rajnees	Student	\N	student	17	t	\N	2026-11-04 03:50:41.678614+00	2026-11-04 10:17:06.092167+00	129	accepted	\N	institute	\N	\N	\N
83	2	ayaan2	ayaan2@prashantacademy.in	$2b$12$vw7Xt0H5p2Qnod6pUMKoMOyE5xG1wfaE/AyXQU6TTOJ0XXzvQVU0.	Ayaan	Student	\N	student	17	t	\N	2026-11-04 03:50:41.678614+00	2026-11-04 10:17:06.092167+00	130	accepted	\N	institute	\N	\N	\N
84	2	netham3	netham3@prashantacademy.in	$2b$12$D8Vb5d1rfQZk2djS4ZpA9eFOcytr.0EccdR1cvaqttFeLfAYWtR2W	Netham	Student	\N	student	17	t	\N	2026-11-04 03:50:41.678614+00	2026-11-04 10:17:06.092167+00	131	accepted	\N	institute	\N	\N	\N
85	2	shreshta4	shreshta4@prashantacademy.in	$2b$12$JgsTYX69.Gtqy8RynQgyfuTm3/6uZ13l2W3wvsstSGn8PxfWagMle	Shreshta	Student	\N	student	17	t	\N	2026-11-04 03:50:41.678614+00	2026-11-04 10:17:06.092167+00	132	accepted	\N	institute	\N	\N	\N
86	2	savesh5	savesh5@prashantacademy.in	$2b$12$qwrNZUQknmGMiQhx/BGM.OByo/NXivJgOO1Pgpd.eVUXkHWxZm102	Savesh	Student	\N	student	17	t	\N	2026-11-04 03:50:41.678614+00	2026-11-04 10:17:06.092167+00	133	accepted	\N	institute	\N	\N	\N
87	2	ansh6	ansh6@prashantacademy.in	$2b$12$KL9ew/HPtUQIu33HGn9mo.C0zv9guoHbgwdQQ/x80HE1ACn6JUCyC	Ansh	Student	\N	student	17	t	\N	2026-11-04 03:50:41.678614+00	2026-11-04 10:17:06.092167+00	134	accepted	\N	institute	\N	\N	\N
88	2	riddhima7	riddhima7@prashantacademy.in	$2b$12$ZRfFYtdR3cZTNhMVtn9yVOgcNN48xxzXz8TxM0DQsuM9uIJreafWy	Riddhima	Student	\N	student	17	t	\N	2026-11-04 03:50:41.678614+00	2026-11-04 10:17:06.092167+00	135	accepted	\N	institute	\N	\N	\N
89	2	sonakshi8	sonakshi8@prashantacademy.in	$2b$12$YXFSIHtug1nBgtu3slxVM.6gttqVDW1DMJWmpVOcxvTE6fn3pIF5K	Sonakshi	Student	\N	student	17	t	\N	2026-11-04 03:50:41.678614+00	2026-11-04 10:17:06.092167+00	136	accepted	\N	institute	\N	\N	\N
90	2	raudrita9	raudrita9@prashantacademy.in	$2b$12$/66G4dfSezYL.i5BSVjyLuzn2ScYlEUz.uNL.dnk7CVNTJ.tkqB9.	Raudrita	Student	\N	student	17	t	\N	2026-11-04 03:50:41.678614+00	2026-11-04 10:17:06.092167+00	137	accepted	\N	institute	\N	\N	\N
106	2	afton25	afton25@prashantacademy.in	$2b$12$Cb2xidE.FTRNcjxPB5ED1uxqbzCEtEDBQSFI.OBVGWiyjOPxpG6lW	Afton	Student	\N	student	17	t	\N	2026-11-04 03:50:41.678614+00	2026-11-04 10:17:06.092167+00	153	accepted	\N	institute	\N	\N	\N
107	2	maahi26	maahi26@prashantacademy.in	$2b$12$XpPhCdth2s86s3P19f1EoeLKZ/sC0QhmkVYkNoSkiGxlGNuR3YhCG	Maahi	Student	\N	student	17	t	\N	2026-11-04 03:50:41.678614+00	2026-11-04 10:17:06.092167+00	154	accepted	\N	institute	\N	\N	\N
108	2	aadya27	aadya27@prashantacademy.in	$2b$12$c36XhduEggw4fzKbk.e3ju4mX7d3/Db2Hvmu2XggZCQJ8FoZs7mnC	Aadya	Student	\N	student	17	t	\N	2026-11-04 03:50:41.678614+00	2026-11-04 10:17:06.092167+00	155	accepted	\N	institute	\N	\N	\N
109	2	rida28	rida28@prashantacademy.in	$2b$12$4t1.P6b1fTEdhEDsvwLc4eErMn6BTjppjsoxFNDD6SMKOpts7pski	Rida	Student	\N	student	17	t	\N	2026-11-04 03:50:41.678614+00	2026-11-04 10:17:06.092167+00	156	accepted	\N	institute	\N	\N	\N
110	2	puneeta29	puneeta29@prashantacademy.in	$2b$12$DC5/EqH1k4zGGxe/Nm8.duQof/Mnd.LN3use7Iq/ehafyPbt4ix1u	Puneeta	Student	\N	student	17	t	\N	2026-11-04 03:50:41.678614+00	2026-11-04 10:17:06.092167+00	157	accepted	\N	institute	\N	\N	\N
111	2	aliya30	aliya30@prashantacademy.in	$2b$12$IU5PnS.Dh4nA3voOqGhciuyCcFJG0387Zw01Ryl0RUVoIyXUlEpFy	Aliya	Student	\N	student	17	t	\N	2026-11-04 03:50:41.678614+00	2026-11-04 10:17:06.092167+00	158	accepted	\N	institute	\N	\N	\N
112	2	siddhant31	siddhant31@prashantacademy.in	$2b$12$YwYcNpqt8oAXA4o1Ycpq4OvJTsWRoUGoh5y99dhrPUhUGZcojS0jq	Siddhant	Student	\N	student	17	t	\N	2026-11-04 03:50:41.678614+00	2026-11-04 10:17:06.092167+00	159	accepted	\N	institute	\N	\N	\N
113	2	shaurya32	shaurya32@prashantacademy.in	$2b$12$KI4tls3nZxfABr/1.ZH1suUr8p4jCmPUnd2ITbOly4VaUmKrPDvp6	Shaurya	Student	\N	student	17	t	\N	2026-11-04 03:50:41.678614+00	2026-11-04 10:17:06.092167+00	160	accepted	\N	institute	\N	\N	\N
114	2	chehek33	chehek33@prashantacademy.in	$2b$12$TzOARdVR0S.SDXvwNf.LtuDW0D/ytSw5373m2FDHlHEsTJj6FI4OK	Chehek	Student	\N	student	17	t	\N	2026-11-04 03:50:41.678614+00	2026-11-04 10:17:06.092167+00	161	accepted	\N	institute	\N	\N	\N
115	2	siddharth34	siddharth34@prashantacademy.in	$2b$12$riSv0NHpyLGs.aHYfE14iuvgurQYL2JJzYIn0d8c1Z297oaMC8rvi	Siddharth	Student	\N	student	17	t	\N	2026-11-04 03:50:41.678614+00	2026-11-04 10:17:06.092167+00	162	accepted	\N	institute	\N	\N	\N
116	2	aditya35	aditya35@prashantacademy.in	$2b$12$LgNwOZ6CaAiWmUb5uhezEOHLiteTH3VcAV/SBO4/Xjbamne1ziKZm	Aditya	Student	\N	student	17	t	\N	2026-11-04 03:50:41.678614+00	2026-11-04 10:17:06.092167+00	163	accepted	\N	institute	\N	\N	\N
117	2	shriya36	shriya36@prashantacademy.in	$2b$12$mqOHCs2A2YDKLf.WHfzIPu/ikGjkvfE8nfDoOro2c1IDT43Ftp/Oy	Shriya	Student	\N	student	17	t	\N	2026-11-04 03:50:41.678614+00	2026-11-04 10:17:06.092167+00	164	accepted	\N	institute	\N	\N	\N
118	2	sukhmeet37	sukhmeet37@prashantacademy.in	$2b$12$wbcFGuk5H9wXfjiEx2ThzexnoM6zm8RmtrHepAZhVp2THzeqxZvpy	Sukhmeet	Student	\N	student	17	t	\N	2026-11-04 03:50:41.678614+00	2026-11-04 10:17:06.092167+00	165	accepted	\N	institute	\N	\N	\N
119	2	sushmya38	sushmya38@prashantacademy.in	$2b$12$wM1On7RyM/u3CVjU8OSFyeaO1bjyWVbbukN1QsF9iYHKG3Vjyg7fG	Sushmya	Student	\N	student	17	t	\N	2026-11-04 03:50:41.678614+00	2026-11-04 10:17:06.092167+00	166	accepted	\N	institute	\N	\N	\N
120	2	aaradhya39	aaradhya39@prashantacademy.in	$2b$12$ieNpays3AFa4RLHd8oNuueNsWv6UUEjdPWr6AwwhGG/4PbtClvOru	Aaradhya	Student	\N	student	17	t	\N	2026-11-04 03:50:41.678614+00	2026-11-04 10:17:06.092167+00	167	accepted	\N	institute	\N	\N	\N
1	2	admin	admin@prashantacademy.edu.in	$2b$12$LOC2e9Dyz3oI8ygzAp16JeamUYLwFQ7.2h0vZdP4Cnj4IHk7zvQWy	Admin	User	+91-9870061122	admin	8	t	2026-11-04 14:28:16.420423+00	2026-11-03 15:17:26.3504+00	2026-11-04 14:28:16.117775+00	\N	accepted	\N	institute	\N	ADM-001	System Administrator
\.


--
-- Name: academic_years_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.academic_years_id_seq', 3, true);


--
-- Name: announcements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.announcements_id_seq', 10, true);


--
-- Name: attendances_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.attendances_id_seq', 2730, true);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 71, true);


--
-- Name: boards_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.boards_id_seq', 7, true);


--
-- Name: data_import_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.data_import_logs_id_seq', 1, false);


--
-- Name: discounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.discounts_id_seq', 1, false);


--
-- Name: divisions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.divisions_id_seq', 54, true);


--
-- Name: exam_marks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.exam_marks_id_seq', 690, true);


--
-- Name: examinations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.examinations_id_seq', 23, true);


--
-- Name: fee_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.fee_categories_id_seq', 7, true);


--
-- Name: fee_installments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.fee_installments_id_seq', 1, false);


--
-- Name: fee_invoice_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.fee_invoice_items_id_seq', 36, true);


--
-- Name: fee_invoices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.fee_invoices_id_seq', 36, true);


--
-- Name: fee_register_imports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.fee_register_imports_id_seq', 1, true);


--
-- Name: fee_structures_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.fee_structures_id_seq', 36, true);


--
-- Name: guardians_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.guardians_id_seq', 79, true);


--
-- Name: institutions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.institutions_id_seq', 3, true);


--
-- Name: payment_allocations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.payment_allocations_id_seq', 170, true);


--
-- Name: payment_receipts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.payment_receipts_id_seq', 170, true);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.payments_id_seq', 170, true);


--
-- Name: permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.permissions_id_seq', 33, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roles_id_seq', 17, true);


--
-- Name: scholarships_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.scholarships_id_seq', 1, false);


--
-- Name: standards_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.standards_id_seq', 19, true);


--
-- Name: student_documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.student_documents_id_seq', 215, true);


--
-- Name: student_enrollments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.student_enrollments_id_seq', 212, true);


--
-- Name: student_fee_assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.student_fee_assignments_id_seq', 36, true);


--
-- Name: students_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.students_id_seq', 167, true);


--
-- Name: study_materials_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.study_materials_id_seq', 22, true);


--
-- Name: subjects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.subjects_id_seq', 59, true);


--
-- Name: timetable_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.timetable_entries_id_seq', 143, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 125, true);


--
-- Name: academic_years academic_years_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_years
    ADD CONSTRAINT academic_years_pkey PRIMARY KEY (id);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: attendances attendances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendances
    ADD CONSTRAINT attendances_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: boards boards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boards
    ADD CONSTRAINT boards_pkey PRIMARY KEY (id);


--
-- Name: data_import_logs data_import_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_import_logs
    ADD CONSTRAINT data_import_logs_pkey PRIMARY KEY (id);


--
-- Name: discounts discounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discounts
    ADD CONSTRAINT discounts_pkey PRIMARY KEY (id);


--
-- Name: divisions divisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.divisions
    ADD CONSTRAINT divisions_pkey PRIMARY KEY (id);


--
-- Name: exam_marks exam_marks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_marks
    ADD CONSTRAINT exam_marks_pkey PRIMARY KEY (id);


--
-- Name: examinations examinations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.examinations
    ADD CONSTRAINT examinations_pkey PRIMARY KEY (id);


--
-- Name: fee_categories fee_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_categories
    ADD CONSTRAINT fee_categories_pkey PRIMARY KEY (id);


--
-- Name: fee_installments fee_installments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_installments
    ADD CONSTRAINT fee_installments_pkey PRIMARY KEY (id);


--
-- Name: fee_invoice_items fee_invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_invoice_items
    ADD CONSTRAINT fee_invoice_items_pkey PRIMARY KEY (id);


--
-- Name: fee_invoices fee_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_invoices
    ADD CONSTRAINT fee_invoices_pkey PRIMARY KEY (id);


--
-- Name: fee_register_imports fee_register_imports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_register_imports
    ADD CONSTRAINT fee_register_imports_pkey PRIMARY KEY (id);


--
-- Name: fee_structures fee_structures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_structures
    ADD CONSTRAINT fee_structures_pkey PRIMARY KEY (id);


--
-- Name: guardians guardians_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guardians
    ADD CONSTRAINT guardians_pkey PRIMARY KEY (id);


--
-- Name: institutions institutions_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institutions
    ADD CONSTRAINT institutions_code_key UNIQUE (code);


--
-- Name: institutions institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institutions
    ADD CONSTRAINT institutions_pkey PRIMARY KEY (id);


--
-- Name: payment_allocations payment_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_allocations
    ADD CONSTRAINT payment_allocations_pkey PRIMARY KEY (id);


--
-- Name: payment_receipts payment_receipts_payment_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_receipts
    ADD CONSTRAINT payment_receipts_payment_id_key UNIQUE (payment_id);


--
-- Name: payment_receipts payment_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_receipts
    ADD CONSTRAINT payment_receipts_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: scholarships scholarships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scholarships
    ADD CONSTRAINT scholarships_pkey PRIMARY KEY (id);


--
-- Name: standards standards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.standards
    ADD CONSTRAINT standards_pkey PRIMARY KEY (id);


--
-- Name: student_documents student_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_documents
    ADD CONSTRAINT student_documents_pkey PRIMARY KEY (id);


--
-- Name: student_enrollments student_enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_enrollments
    ADD CONSTRAINT student_enrollments_pkey PRIMARY KEY (id);


--
-- Name: student_fee_assignments student_fee_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_fee_assignments
    ADD CONSTRAINT student_fee_assignments_pkey PRIMARY KEY (id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: study_materials study_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_materials
    ADD CONSTRAINT study_materials_pkey PRIMARY KEY (id);


--
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);


--
-- Name: timetable_entries timetable_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_entries
    ADD CONSTRAINT timetable_entries_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ix_academic_years_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_academic_years_id ON public.academic_years USING btree (id);


--
-- Name: ix_announcements_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_announcements_id ON public.announcements USING btree (id);


--
-- Name: ix_attendances_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_attendances_id ON public.attendances USING btree (id);


--
-- Name: ix_attendances_student_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_attendances_student_date ON public.attendances USING btree (student_id, date);


--
-- Name: ix_audit_logs_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_audit_logs_id ON public.audit_logs USING btree (id);


--
-- Name: ix_boards_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_boards_id ON public.boards USING btree (id);


--
-- Name: ix_data_import_logs_entity_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_data_import_logs_entity_type ON public.data_import_logs USING btree (entity_type);


--
-- Name: ix_data_import_logs_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_data_import_logs_id ON public.data_import_logs USING btree (id);


--
-- Name: ix_discounts_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_discounts_id ON public.discounts USING btree (id);


--
-- Name: ix_divisions_board_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_divisions_board_id ON public.divisions USING btree (board_id);


--
-- Name: ix_divisions_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_divisions_id ON public.divisions USING btree (id);


--
-- Name: ix_divisions_standard_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_divisions_standard_id ON public.divisions USING btree (standard_id);


--
-- Name: ix_divisions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_divisions_status ON public.divisions USING btree (status);


--
-- Name: ix_exam_marks_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_exam_marks_id ON public.exam_marks USING btree (id);


--
-- Name: ix_exam_marks_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_exam_marks_student_id ON public.exam_marks USING btree (student_id);


--
-- Name: ix_examinations_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_examinations_id ON public.examinations USING btree (id);


--
-- Name: ix_fee_categories_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fee_categories_id ON public.fee_categories USING btree (id);


--
-- Name: ix_fee_installments_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fee_installments_id ON public.fee_installments USING btree (id);


--
-- Name: ix_fee_invoice_items_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fee_invoice_items_id ON public.fee_invoice_items USING btree (id);


--
-- Name: ix_fee_invoices_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fee_invoices_id ON public.fee_invoices USING btree (id);


--
-- Name: ix_fee_invoices_invoice_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_fee_invoices_invoice_number ON public.fee_invoices USING btree (invoice_number);


--
-- Name: ix_fee_invoices_student_ay; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fee_invoices_student_ay ON public.fee_invoices USING btree (student_id, academic_year_id);


--
-- Name: ix_fee_register_imports_file_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_fee_register_imports_file_hash ON public.fee_register_imports USING btree (file_hash);


--
-- Name: ix_fee_register_imports_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fee_register_imports_id ON public.fee_register_imports USING btree (id);


--
-- Name: ix_fee_structures_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fee_structures_id ON public.fee_structures USING btree (id);


--
-- Name: ix_guardians_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_guardians_id ON public.guardians USING btree (id);


--
-- Name: ix_institutions_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_institutions_id ON public.institutions USING btree (id);


--
-- Name: ix_payment_allocations_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_payment_allocations_id ON public.payment_allocations USING btree (id);


--
-- Name: ix_payment_allocations_invoice_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_payment_allocations_invoice_id ON public.payment_allocations USING btree (invoice_id);


--
-- Name: ix_payment_allocations_payment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_payment_allocations_payment_id ON public.payment_allocations USING btree (payment_id);


--
-- Name: ix_payment_receipts_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_payment_receipts_id ON public.payment_receipts USING btree (id);


--
-- Name: ix_payment_receipts_receipt_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_payment_receipts_receipt_number ON public.payment_receipts USING btree (receipt_number);


--
-- Name: ix_payments_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_payments_id ON public.payments USING btree (id);


--
-- Name: ix_payments_student_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_payments_student_date ON public.payments USING btree (student_id, payment_date);


--
-- Name: ix_permissions_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_permissions_id ON public.permissions USING btree (id);


--
-- Name: ix_roles_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_roles_id ON public.roles USING btree (id);


--
-- Name: ix_scholarships_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_scholarships_id ON public.scholarships USING btree (id);


--
-- Name: ix_standards_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_standards_id ON public.standards USING btree (id);


--
-- Name: ix_student_documents_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_student_documents_id ON public.student_documents USING btree (id);


--
-- Name: ix_student_enrollments_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_student_enrollments_id ON public.student_enrollments USING btree (id);


--
-- Name: ix_student_enrollments_student_ay; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_student_enrollments_student_ay ON public.student_enrollments USING btree (student_id, academic_year_id);


--
-- Name: ix_student_fee_assignments_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_student_fee_assignments_id ON public.student_fee_assignments USING btree (id);


--
-- Name: ix_students_admission_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_students_admission_number ON public.students USING btree (admission_number);


--
-- Name: ix_students_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_students_id ON public.students USING btree (id);


--
-- Name: ix_study_materials_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_study_materials_id ON public.study_materials USING btree (id);


--
-- Name: ix_subjects_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_subjects_id ON public.subjects USING btree (id);


--
-- Name: ix_timetable_entries_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_timetable_entries_id ON public.timetable_entries USING btree (id);


--
-- Name: ix_users_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_users_id ON public.users USING btree (id);


--
-- Name: ix_users_invitation_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_users_invitation_status ON public.users USING btree (invitation_status);


--
-- Name: ix_users_staff_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_users_staff_code ON public.users USING btree (staff_code);


--
-- Name: ix_users_username; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_users_username ON public.users USING btree (username);


--
-- Name: uq_active_student_academic_year; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_active_student_academic_year ON public.student_enrollments USING btree (student_id, academic_year_id) WHERE ((status)::text = 'active'::text);


--
-- Name: uq_divisions_standard_board_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_divisions_standard_board_code ON public.divisions USING btree (standard_id, board_id, code) WHERE ((is_active = true) AND (code IS NOT NULL));


--
-- Name: uq_standards_institution_level; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_standards_institution_level ON public.standards USING btree (institution_id, level) WHERE (is_active = true);


--
-- Name: uq_student_fee_assignment_ay; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_student_fee_assignment_ay ON public.student_fee_assignments USING btree (student_id, academic_year_id);


--
-- Name: uq_subjects_standard_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_subjects_standard_code ON public.subjects USING btree (standard_id, code) WHERE (is_active = true);


--
-- Name: uq_timetable_division_slot; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_timetable_division_slot ON public.timetable_entries USING btree (division_id, day_of_week, start_time) WHERE (is_active = true);


--
-- Name: academic_years academic_years_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_years
    ADD CONSTRAINT academic_years_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id);


--
-- Name: announcements announcements_division_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.divisions(id) ON DELETE SET NULL;


--
-- Name: announcements announcements_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: announcements announcements_standard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_standard_id_fkey FOREIGN KEY (standard_id) REFERENCES public.standards(id) ON DELETE SET NULL;


--
-- Name: attendances attendances_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendances
    ADD CONSTRAINT attendances_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES public.student_enrollments(id);


--
-- Name: attendances attendances_marked_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendances
    ADD CONSTRAINT attendances_marked_by_id_fkey FOREIGN KEY (marked_by_id) REFERENCES public.users(id);


--
-- Name: attendances attendances_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendances
    ADD CONSTRAINT attendances_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: boards boards_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boards
    ADD CONSTRAINT boards_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: data_import_logs data_import_logs_academic_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_import_logs
    ADD CONSTRAINT data_import_logs_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id);


--
-- Name: data_import_logs data_import_logs_imported_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_import_logs
    ADD CONSTRAINT data_import_logs_imported_by_id_fkey FOREIGN KEY (imported_by_id) REFERENCES public.users(id);


--
-- Name: data_import_logs data_import_logs_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_import_logs
    ADD CONSTRAINT data_import_logs_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id);


--
-- Name: discounts discounts_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discounts
    ADD CONSTRAINT discounts_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id);


--
-- Name: divisions divisions_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.divisions
    ADD CONSTRAINT divisions_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.boards(id) ON DELETE SET NULL;


--
-- Name: divisions divisions_class_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.divisions
    ADD CONSTRAINT divisions_class_teacher_id_fkey FOREIGN KEY (class_teacher_id) REFERENCES public.users(id);


--
-- Name: divisions divisions_standard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.divisions
    ADD CONSTRAINT divisions_standard_id_fkey FOREIGN KEY (standard_id) REFERENCES public.standards(id);


--
-- Name: exam_marks exam_marks_examination_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_marks
    ADD CONSTRAINT exam_marks_examination_id_fkey FOREIGN KEY (examination_id) REFERENCES public.examinations(id);


--
-- Name: exam_marks exam_marks_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_marks
    ADD CONSTRAINT exam_marks_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- Name: exam_marks exam_marks_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_marks
    ADD CONSTRAINT exam_marks_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- Name: examinations examinations_academic_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.examinations
    ADD CONSTRAINT examinations_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id);


--
-- Name: examinations examinations_standard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.examinations
    ADD CONSTRAINT examinations_standard_id_fkey FOREIGN KEY (standard_id) REFERENCES public.standards(id);


--
-- Name: fee_categories fee_categories_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_categories
    ADD CONSTRAINT fee_categories_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id);


--
-- Name: fee_installments fee_installments_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_installments
    ADD CONSTRAINT fee_installments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.fee_invoices(id);


--
-- Name: fee_invoice_items fee_invoice_items_fee_structure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_invoice_items
    ADD CONSTRAINT fee_invoice_items_fee_structure_id_fkey FOREIGN KEY (fee_structure_id) REFERENCES public.fee_structures(id);


--
-- Name: fee_invoice_items fee_invoice_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_invoice_items
    ADD CONSTRAINT fee_invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.fee_invoices(id);


--
-- Name: fee_invoices fee_invoices_academic_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_invoices
    ADD CONSTRAINT fee_invoices_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id);


--
-- Name: fee_invoices fee_invoices_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_invoices
    ADD CONSTRAINT fee_invoices_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.student_fee_assignments(id);


--
-- Name: fee_invoices fee_invoices_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_invoices
    ADD CONSTRAINT fee_invoices_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- Name: fee_register_imports fee_register_imports_academic_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_register_imports
    ADD CONSTRAINT fee_register_imports_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id);


--
-- Name: fee_register_imports fee_register_imports_imported_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_register_imports
    ADD CONSTRAINT fee_register_imports_imported_by_id_fkey FOREIGN KEY (imported_by_id) REFERENCES public.users(id);


--
-- Name: fee_register_imports fee_register_imports_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_register_imports
    ADD CONSTRAINT fee_register_imports_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id);


--
-- Name: fee_structures fee_structures_academic_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_structures
    ADD CONSTRAINT fee_structures_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id);


--
-- Name: fee_structures fee_structures_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_structures
    ADD CONSTRAINT fee_structures_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.fee_categories(id);


--
-- Name: fee_structures fee_structures_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_structures
    ADD CONSTRAINT fee_structures_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id);


--
-- Name: fee_structures fee_structures_standard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_structures
    ADD CONSTRAINT fee_structures_standard_id_fkey FOREIGN KEY (standard_id) REFERENCES public.standards(id);


--
-- Name: guardians guardians_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guardians
    ADD CONSTRAINT guardians_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- Name: payment_allocations payment_allocations_installment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_allocations
    ADD CONSTRAINT payment_allocations_installment_id_fkey FOREIGN KEY (installment_id) REFERENCES public.fee_installments(id);


--
-- Name: payment_allocations payment_allocations_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_allocations
    ADD CONSTRAINT payment_allocations_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.fee_invoices(id);


--
-- Name: payment_allocations payment_allocations_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_allocations
    ADD CONSTRAINT payment_allocations_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id);


--
-- Name: payment_receipts payment_receipts_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_receipts
    ADD CONSTRAINT payment_receipts_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id);


--
-- Name: payment_receipts payment_receipts_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_receipts
    ADD CONSTRAINT payment_receipts_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- Name: payments payments_academic_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id);


--
-- Name: payments payments_collected_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_collected_by_id_fkey FOREIGN KEY (collected_by_id) REFERENCES public.users(id);


--
-- Name: payments payments_reversed_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_reversed_by_id_fkey FOREIGN KEY (reversed_by_id) REFERENCES public.users(id);


--
-- Name: payments payments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- Name: permissions permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: scholarships scholarships_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scholarships
    ADD CONSTRAINT scholarships_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id);


--
-- Name: standards standards_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.standards
    ADD CONSTRAINT standards_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id);


--
-- Name: student_documents student_documents_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_documents
    ADD CONSTRAINT student_documents_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_enrollments student_enrollments_academic_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_enrollments
    ADD CONSTRAINT student_enrollments_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id);


--
-- Name: student_enrollments student_enrollments_division_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_enrollments
    ADD CONSTRAINT student_enrollments_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.divisions(id);


--
-- Name: student_enrollments student_enrollments_standard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_enrollments
    ADD CONSTRAINT student_enrollments_standard_id_fkey FOREIGN KEY (standard_id) REFERENCES public.standards(id);


--
-- Name: student_enrollments student_enrollments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_enrollments
    ADD CONSTRAINT student_enrollments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- Name: student_fee_assignments student_fee_assignments_academic_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_fee_assignments
    ADD CONSTRAINT student_fee_assignments_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id);


--
-- Name: student_fee_assignments student_fee_assignments_discount_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_fee_assignments
    ADD CONSTRAINT student_fee_assignments_discount_id_fkey FOREIGN KEY (discount_id) REFERENCES public.discounts(id);


--
-- Name: student_fee_assignments student_fee_assignments_fee_structure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_fee_assignments
    ADD CONSTRAINT student_fee_assignments_fee_structure_id_fkey FOREIGN KEY (fee_structure_id) REFERENCES public.fee_structures(id);


--
-- Name: student_fee_assignments student_fee_assignments_scholarship_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_fee_assignments
    ADD CONSTRAINT student_fee_assignments_scholarship_id_fkey FOREIGN KEY (scholarship_id) REFERENCES public.scholarships(id);


--
-- Name: student_fee_assignments student_fee_assignments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_fee_assignments
    ADD CONSTRAINT student_fee_assignments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- Name: students students_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id);


--
-- Name: study_materials study_materials_division_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_materials
    ADD CONSTRAINT study_materials_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.divisions(id) ON DELETE SET NULL;


--
-- Name: study_materials study_materials_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_materials
    ADD CONSTRAINT study_materials_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: study_materials study_materials_standard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_materials
    ADD CONSTRAINT study_materials_standard_id_fkey FOREIGN KEY (standard_id) REFERENCES public.standards(id) ON DELETE CASCADE;


--
-- Name: study_materials study_materials_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_materials
    ADD CONSTRAINT study_materials_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- Name: subjects subjects_standard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_standard_id_fkey FOREIGN KEY (standard_id) REFERENCES public.standards(id);


--
-- Name: timetable_entries timetable_entries_division_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_entries
    ADD CONSTRAINT timetable_entries_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.divisions(id) ON DELETE CASCADE;


--
-- Name: timetable_entries timetable_entries_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_entries
    ADD CONSTRAINT timetable_entries_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- Name: users users_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id);


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: users users_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict 1uCruHWiMtadQoNX0JUu7S1zcBYUfKVhNNnHEpntjStmS14o5jcQ9ZqaUac0PhT

