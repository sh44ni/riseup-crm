import unittest
import hashlib
import hmac
import secrets
import asyncio
from app.core.config import settings
from app.models.api_key import ApiKey

class TestDeveloperSystem(unittest.TestCase):
    def test_seedphrase_verification(self):
        # 1. Correct seedphrase: "sheWASg0n3forgood"
        correct_seed = "sheWASg0n3forgood"

        # Verify hash match
        computed_hash = hashlib.sha256(correct_seed.encode("utf-8")).hexdigest()
        self.assertEqual(computed_hash, settings.DEVELOPER_SEEDPHRASE_HASH)
        self.assertTrue(hmac.compare_digest(computed_hash, settings.DEVELOPER_SEEDPHRASE_HASH))

        # 2. Incorrect seedphrases
        wrong_seeds = ["wrongpassword", "SheWASg0n3forgood", "admin", "123456", ""]
        for wrong in wrong_seeds:
            wrong_hash = hashlib.sha256(wrong.encode("utf-8")).hexdigest()
            self.assertFalse(hmac.compare_digest(wrong_hash, settings.DEVELOPER_SEEDPHRASE_HASH))

    def test_api_key_generation_and_hash(self):
        # Test generation of raw live and test keys
        live_secret = secrets.token_urlsafe(32)
        raw_key = f"{settings.API_KEY_PREFIX_LIVE}{live_secret}"

        self.assertTrue(raw_key.startswith("rup_live_"))
        key_prefix = raw_key[:12]
        last_four = raw_key[-4:]
        key_hash = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

        self.assertEqual(len(key_hash), 64)

        # Model instantiation
        api_key_obj = ApiKey(
            id=1,
            name="Next.js Production Frontend",
            key_prefix=key_prefix,
            key_hash=key_hash,
            last_four=last_four,
            environment="live",
            scopes=["*"],
            rate_limit_per_minute=300,
            allowed_origins=["https://riseuprac.com"],
            is_active=True,
        )

        d = api_key_obj.to_dict()
        self.assertEqual(d["id"], 1)
        self.assertEqual(d["name"], "Next.js Production Frontend")
        self.assertEqual(d["key_prefix"], key_prefix)
        self.assertEqual(d["last_four"], last_four)
        self.assertEqual(d["environment"], "live")
        self.assertEqual(d["scopes"], ["*"])
        self.assertEqual(d["rate_limit_per_minute"], 300)
        self.assertTrue(d["is_active"])

    def test_api_key_scope_evaluation(self):
        from app.core.permissions import AuthUser, has_permission

        # 1. API key with wildcard scope '*'
        admin_key_user = AuthUser(
            id=10,
            name="APIKey:AdminClient",
            email="rup_live_adm@api.riseuprac.com",
            role="api_client",
            status="active",
            permissions={"*": "all"},
            is_protected_owner=True,
            is_api_key=True,
            api_key_id=10,
        )
        self.assertTrue(has_permission(admin_key_user, "leads.view"))
        self.assertTrue(has_permission(admin_key_user, "finances.view"))
        self.assertTrue(has_permission(admin_key_user, "anything.custom"))

        # 2. Granular API key with only 'crm.read' scope
        crm_read_user = AuthUser(
            id=11,
            name="APIKey:PartnerCRM",
            email="rup_live_crm@api.riseuprac.com",
            role="api_client",
            status="active",
            permissions={"crm.read": "all", "leads.view": "all"},
            is_protected_owner=False,
            is_api_key=True,
            api_key_id=11,
        )
        self.assertTrue(has_permission(crm_read_user, "leads.view"))
        self.assertFalse(has_permission(crm_read_user, "finances.view"))
        self.assertFalse(has_permission(crm_read_user, "users.manage"))

if __name__ == "__main__":
    unittest.main()
