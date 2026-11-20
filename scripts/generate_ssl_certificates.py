# /**
#  * @file        generate_ssl_certificates.py
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
#  * @created     2026-11-20
#  * @updated     2026-11-21
#  *
#  * @description Automated generation of local Root Certificate Authority (CA) and multi-domain
#  */

import datetime
import ipaddress
from pathlib import Path
from typing import List, Optional

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import ExtendedKeyUsageOID, NameOID


def generate_local_pki(output_dir: Path, extra_slugs: Optional[List[str]] = None) -> tuple[Path, Path, Path, Path]:
    """
    Generates:
    1. Smritisys & AITDL Networks Local Root CA (.cer and .key)
    2. Server SSL Certificate with Subject Alternative Names (SANs) (.pem and .key)
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    ca_cert_path = output_dir / "Smritisys_AITDL_Local_CA.cer"
    ca_key_path = output_dir / "Smritisys_AITDL_Local_CA.key"
    server_cert_path = output_dir / "prathamone_ssl_cert.pem"
    server_key_path = output_dir / "prathamone_ssl_key.pem"

    now = datetime.datetime.now(datetime.timezone.utc)

    # 1. Root CA Key & Certificate
    ca_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    ca_name = x509.Name([
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Smritisys & AITDL Networks"),
        x509.NameAttribute(NameOID.ORGANIZATIONAL_UNIT_NAME, "Security Operations"),
        x509.NameAttribute(NameOID.COMMON_NAME, "Smritisys & AITDL Networks Local Root CA"),
    ])

    ca_cert = (
        x509.CertificateBuilder()
        .subject_name(ca_name)
        .issuer_name(ca_name)
        .public_key(ca_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - datetime.timedelta(days=1))
        .not_valid_after(now + datetime.timedelta(days=3650))  # 10 years
        .add_extension(x509.BasicConstraints(ca=True, path_length=None), critical=True)
        .add_extension(
            x509.KeyUsage(
                digital_signature=True,
                key_encipherment=False,
                key_cert_sign=True,
                crl_sign=True,
                content_commitment=False,
                data_encipherment=False,
                key_agreement=False,
                encipher_only=False,
                decipher_only=False,
            ),
            critical=True,
        )
        .sign(ca_key, hashes.SHA256())
    )

    # Save Root CA files
    ca_cert_path.write_bytes(ca_cert.public_bytes(serialization.Encoding.PEM))
    ca_key_path.write_bytes(
        ca_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption(),
        )
    )

    # 2. Server SSL Key & Certificate
    server_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    server_name = x509.Name([
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Smritisys & AITDL Networks"),
        x509.NameAttribute(NameOID.COMMON_NAME, "prathamone.local"),
    ])

    # Subject Alternative Names (SANs) - critical for Chrome and Edge
    domain_names = [
        "localhost",
        "*.localhost",
        "prathamone",
        "prathamone.local",
        "classesname",
        "classesname.local",
        "aditiacademy",
        "aditiacademy.local",
        "prashantacademy",
        "prashantacademy.local",
    ]
    if extra_slugs:
        for slug in extra_slugs:
            cleaned = "".join(c.lower() for c in slug if c.isalnum())
            if cleaned and cleaned not in domain_names:
                domain_names.append(cleaned)
                domain_names.append(f"{cleaned}.local")

    san_list: List[x509.GeneralName] = [x509.DNSName(d) for d in domain_names]
    san_list.append(x509.IPAddress(ipaddress.IPv4Address("127.0.0.1")))
    san_list.append(x509.IPAddress(ipaddress.IPv6Address("::1")))

    # Auto-detect local LAN IP addresses and host machine network names for multi-device LAN access
    import socket
    try:
        host_name = socket.gethostname().lower()
        for h_variant in [host_name, f"{host_name}.local"]:
            if h_variant not in domain_names:
                domain_names.append(h_variant)
                san_list.append(x509.DNSName(h_variant))
        _, _, ip_list = socket.gethostbyname_ex(host_name)
        for ip_str in ip_list:
            try:
                ip_obj = ipaddress.ip_address(ip_str)
                if not ip_obj.is_loopback and x509.IPAddress(ip_obj) not in san_list:
                    san_list.append(x509.IPAddress(ip_obj))
            except ValueError:
                pass
    except Exception:
        pass

    server_cert = (
        x509.CertificateBuilder()
        .subject_name(server_name)
        .issuer_name(ca_name)
        .public_key(server_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - datetime.timedelta(days=1))
        .not_valid_after(now + datetime.timedelta(days=1825))  # 5 years
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .add_extension(x509.SubjectAlternativeName(san_list), critical=False)
        .add_extension(x509.ExtendedKeyUsage([ExtendedKeyUsageOID.SERVER_AUTH]), critical=False)
        .sign(ca_key, hashes.SHA256())
    )

    # Save Server SSL files
    server_cert_path.write_bytes(server_cert.public_bytes(serialization.Encoding.PEM))
    server_key_path.write_bytes(
        server_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption(),
        )
    )

    print(f"[SSL PKI] Generated Root CA: {ca_cert_path.name}")
    print(f"[SSL PKI] Generated Server SSL Certificate: {server_cert_path.name} with {len(san_list)} SAN entries.")
    return ca_cert_path, ca_key_path, server_cert_path, server_key_path


if __name__ == "__main__":
    import argparse
    import json

    repo_root = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(description="Generate Local Root CA and SAN SSL Certificates")
    parser.add_argument("--slug", default="", help="Custom institute slug without space")
    parser.add_argument("--output-dir", default=None, help="Target output directory for certificates")
    args = parser.parse_args()

    slugs = []
    if args.slug:
        slugs.append(args.slug)

    # Inspect setup_config.json
    cfg_file = repo_root / "setup_config.json"
    if cfg_file.is_file():
        try:
            cfg_data = json.loads(cfg_file.read_text(encoding="utf-8"))
            inst_name = cfg_data.get("institute_name", "")
            cleaned = "".join(c.lower() for c in inst_name if c.isalnum())
            if cleaned and cleaned not in ("youracademyname", "institute"):
                slugs.append(cleaned)
        except Exception:
            pass

    # Inspect .env
    env_file = repo_root / ".env"
    if env_file.is_file():
        try:
            for line in env_file.read_text(encoding="utf-8").splitlines():
                if line.startswith("INSTITUTE_SLUG=") or line.startswith("INSTITUTE_NAME="):
                    val = line.split("=", 1)[1].strip().strip("'\"")
                    cleaned = "".join(c.lower() for c in val if c.isalnum())
                    if cleaned and cleaned not in ("youracademyname", "institute"):
                        slugs.append(cleaned)
        except Exception:
            pass

    if args.output_dir:
        assets_dir = Path(args.output_dir)
    else:
        assets_dir = repo_root / "assets"
        if not assets_dir.exists() and (repo_root / "installer" / "assets").exists():
            assets_dir = repo_root / "installer" / "assets"

    assets_dir.mkdir(parents=True, exist_ok=True)
    generate_local_pki(assets_dir, extra_slugs=slugs)

    # Sync to alternate folder if exists
    alt_dir = repo_root / "installer" / "assets" if assets_dir == repo_root / "assets" else repo_root / "assets"
    if alt_dir.exists():
        import shutil
        for fname in ["Smritisys_AITDL_Local_CA.cer", "Smritisys_AITDL_Local_CA.key", "prathamone_ssl_cert.pem", "prathamone_ssl_key.pem"]:
            src = assets_dir / fname
            if src.exists():
                shutil.copy2(src, alt_dir / fname)

