#!/usr/bin/env python3
"""
One-time script to generate a new bcrypt hash for the developer seedphrase.

Usage:
    cd backend
    python scripts/generate_dev_hash.py

Then copy the output hash into your .env file as:
    DEVELOPER_SEEDPHRASE_HASH=<output>
"""
import bcrypt
import getpass
import sys

def main():
    print("=" * 60)
    print("Developer Seedphrase Hash Generator")
    print("=" * 60)
    print()
    
    passphrase = getpass.getpass("Enter new developer seedphrase: ")
    confirm = getpass.getpass("Confirm seedphrase: ")
    
    if passphrase != confirm:
        print("ERROR: Passphrases do not match.")
        sys.exit(1)
    
    if len(passphrase) < 12:
        print("WARNING: Passphrase is short. Use at least 12 characters.")
    
    hashed = bcrypt.hashpw(passphrase.encode("utf-8"), bcrypt.gensalt(rounds=12))
    
    print()
    print("Generated bcrypt hash (add to .env):")
    print()
    print(f"DEVELOPER_SEEDPHRASE_HASH={hashed.decode('utf-8')}")
    print()
    print("IMPORTANT: Remove DEVELOPER_SEEDPHRASE from .env after updating the hash.")
    print("IMPORTANT: Do NOT commit the actual passphrase or hash to git.")

if __name__ == "__main__":
    main()
