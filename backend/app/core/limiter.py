# /**
#  * @file        limiter.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      backend.app.core
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-04
#  * @updated     2026-11-04
#  *
#  * @description SlowAPI rate limiter instance and request throttling utilities.
#  */

from slowapi import Limiter
from slowapi.util import get_remote_address

# In-process rate limiter per remote IP
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

