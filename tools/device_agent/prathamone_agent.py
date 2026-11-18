#!/usr/bin/env python3
# /**
#  * @file        prathamone_agent.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      tools.device_agent
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
#  * @description Lightweight native companion agent to read physical network MAC address and motherboard UUID for high-security device binding.
#  */

import hashlib
import http.server
import json
import os
import platform
import re
import socketserver
import subprocess
import sys
import uuid

PORT = 9876


def get_all_mac_addresses():
    """
    Retrieves all available network adapter MAC addresses, prioritizing physical Ethernet and Wi-Fi.
    """
    adapters = []
    primary_mac = None

    if platform.system() == "Windows":
        try:
            # Query PowerShell Get-NetAdapter for accurate physical MACs
            cmd = [
                "powershell",
                "-NoProfile",
                "-Command",
                "Get-NetAdapter | Select-Object -Property Name, InterfaceDescription, MacAddress, Status | ConvertTo-Json -Compress"
            ]
            raw = subprocess.check_output(cmd, text=True, stderr=subprocess.DEVNULL).strip()
            if raw:
                parsed = json.loads(raw)
                if isinstance(parsed, dict):
                    parsed = [parsed]
                for item in parsed:
                    mac = item.get("MacAddress")
                    desc = item.get("InterfaceDescription", "")
                    status = item.get("Status", "")
                    if mac:
                        normalized_mac = mac.replace("-", ":").upper()
                        is_virtual = any(
                            v in desc.lower()
                            for v in ["virtual", "hyper-v", "wsl", "vmware", "virtualbox", "tap-", "vpn"]
                        )
                        adapters.append({
                            "name": item.get("Name", "Network Adapter"),
                            "description": desc,
                            "mac": normalized_mac,
                            "status": status,
                            "is_virtual": is_virtual,
                        })
        except Exception:
            pass

    # Fallback to uuid.getnode() if list is empty
    if not adapters:
        node = uuid.getnode()
        fallback_mac = ":".join(f"{(node >> i) & 0xff:02X}" for i in range(0, 48, 8)[::-1])
        adapters.append({
            "name": "Default Network Interface",
            "description": "System Primary NIC",
            "mac": fallback_mac,
            "status": "Up",
            "is_virtual": False,
        })

    # Prioritize non-virtual active adapter
    for a in adapters:
        if not a["is_virtual"] and a.get("status") == "Up":
            primary_mac = a["mac"]
            break

    if not primary_mac and adapters:
        primary_mac = adapters[0]["mac"]

    return primary_mac, adapters


def get_motherboard_uuid():
    """
    Retrieves motherboard UUID / System Serial Number from firmware/BIOS.
    """
    sys_type = platform.system()
    try:
        if sys_type == "Windows":
            cmd = [
                "powershell",
                "-NoProfile",
                "-Command",
                "(Get-CimInstance Win32_ComputerSystemProduct).UUID"
            ]
            out = subprocess.check_output(cmd, text=True, stderr=subprocess.DEVNULL).strip()
            if out and len(out) > 5 and "error" not in out.lower():
                return out.upper()

            # Secondary fallback: wmic
            wmic_out = subprocess.check_output(["wmic", "csproduct", "get", "uuid"], text=True, stderr=subprocess.DEVNULL)
            lines = [l.strip() for l in wmic_out.splitlines() if l.strip() and "UUID" not in l]
            if lines:
                return lines[0].upper()

        elif sys_type == "Linux":
            if os.path.exists("/sys/class/dmi/id/product_uuid"):
                with open("/sys/class/dmi/id/product_uuid", "r") as f:
                    return f.read().strip().upper()

        elif sys_type == "Darwin":
            cmd = ["ioreg", "-rd1", "-c", "IOPlatformExpertDevice"]
            out = subprocess.check_output(cmd, text=True, stderr=subprocess.DEVNULL)
            m = re.search(r'"IOPlatformUUID"\s*=\s*"([^"]+)"', out)
            if m:
                return m.group(1).upper()

    except Exception:
        pass

    return "UNKNOWN-MOTHERBOARD-UUID"


def get_hardware_payload():
    """
    Assembles complete hardware profile and cryptographic fingerprint.
    """
    primary_mac, adapters = get_all_mac_addresses()
    mb_uuid = get_motherboard_uuid()
    hostname = platform.node()
    os_name = f"{platform.system()} {platform.release()}"
    processor = platform.processor() or "Standard Architecture"

    # Deterministic fingerprint combining MAC and Motherboard UUID
    raw_signature = f"MAC={primary_mac}|UUID={mb_uuid}|HOST={hostname}"
    hw_hash = hashlib.sha256(raw_signature.encode("utf-8")).hexdigest()[:32]
    fingerprint = f"mac_{primary_mac.replace(':', '').lower()}_{hw_hash[:16]}"

    return {
        "status": "success",
        "agent": "PrathamOne Hardware Companion Agent",
        "version": "1.0.0",
        "hostname": hostname,
        "os": os_name,
        "processor": processor,
        "primary_mac": primary_mac,
        "motherboard_uuid": mb_uuid,
        "device_fingerprint": fingerprint,
        "adapters": adapters,
    }


class HardwareAgentHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS for browser access from local and institute web origins
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if self.path in ("/hardware-identity", "/device-info"):
            payload = get_hardware_payload()
            body = json.dumps(payload, indent=2).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        elif self.path in ("/health", "/ping"):
            body = b'{"status":"ok","agent":"prathamone-device-agent"}'
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        # Silent clean logging
        pass


def main():
    print("=" * 65)
    print("  PRATHAMONE EduOS — HARDWARE COMPANION AGENT v1.0.0")
    print("  Smritisys & AITDL Networks — Coaching Institute Security")
    print("=" * 65)
    info = get_hardware_payload()
    print(f"  [HOST]             : {info['hostname']}")
    print(f"  [OS]               : {info['os']}")
    print(f"  [PRIMARY MAC]      : {info['primary_mac']}")
    print(f"  [MOTHERBOARD UUID] : {info['motherboard_uuid']}")
    print(f"  [FINGERPRINT]      : {info['device_fingerprint']}")
    print("-" * 65)
    print(f"  [LISTENING]        : http://127.0.0.1:{PORT}/hardware-identity")
    print("  [READY]            : PrathamOne EduOS web browser can now read this hardware profile.")
    print("=" * 65)

    with socketserver.TCPServer(("127.0.0.1", PORT), HardwareAgentHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n  Agent stopped gracefully.")


if __name__ == "__main__":
    main()
