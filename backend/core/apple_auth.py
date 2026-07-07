"""Verify Sign in with Apple identity tokens (JWT from Apple)."""

from __future__ import annotations

import json
import os
import time

import jwt
import requests
from jwt.algorithms import RSAAlgorithm

APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys'
_KEYS_CACHE: dict[str, object] = {'keys': None, 'fetched_at': 0.0}


def apple_signin_client_ids() -> list[str]:
    raw = os.getenv('APPLE_SIGNIN_CLIENT_IDS', '').strip()
    if not raw:
        raw = os.getenv('APPLE_SIGNIN_BUNDLE_ID', 'com.rahbe.leveld').strip()
    return [x.strip() for x in raw.split(',') if x.strip()]


def _fetch_apple_public_keys() -> list[dict]:
    now = time.time()
    cached = _KEYS_CACHE.get('keys')
    fetched_at = float(_KEYS_CACHE.get('fetched_at') or 0)
    if cached and now - fetched_at < 3600:
        return cached  # type: ignore[return-value]

    resp = requests.get(APPLE_KEYS_URL, timeout=10)
    resp.raise_for_status()
    keys = resp.json()['keys']
    _KEYS_CACHE['keys'] = keys
    _KEYS_CACHE['fetched_at'] = now
    return keys


def verify_apple_identity_token(token: str) -> dict:
    """Return decoded Apple JWT claims or raise ValueError."""
    client_ids = apple_signin_client_ids()
    if not client_ids:
        raise ValueError('Apple sign-in is not configured on the server.')

    headers = jwt.get_unverified_header(token)
    kid = headers.get('kid')
    if not kid:
        raise ValueError('Invalid Apple token header.')

    public_key = None
    for key in _fetch_apple_public_keys():
        if key.get('kid') == kid:
            public_key = RSAAlgorithm.from_jwk(json.dumps(key))
            break
    if not public_key:
        raise ValueError('Apple public key not found.')

    audience = client_ids if len(client_ids) > 1 else client_ids[0]
    return jwt.decode(
        token,
        public_key,
        algorithms=['RS256'],
        audience=audience,
        issuer='https://appleid.apple.com',
    )
