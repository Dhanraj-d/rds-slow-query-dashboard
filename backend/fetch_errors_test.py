import re
import os

# Sample log file path
LOG_FILE = "error_sample.log"

# Original Regex from ingest.py
ORIGINAL_REGEX = re.compile(
    r"^(?P<timestamp>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC):[^:]+:(?P<userdb>[^:]+):(?P<level>FATAL|ERROR|PANIC):\s+(?P<message>.+)$",
    re.MULTILINE
)

# New Regex accounting for PID field [12345]
# Structure: Timestamp : IP : User@DB : [PID] : Level : Message
# Note: IP part might be variable. User@DB might vary.
# We match:
# 1. Timestamp
# 2. : IP (skipped by [^:]+)
# 3. : User@DB
# 4. : [PID] (Optional? Or required?)
# 5. : Level
NEW_REGEX = re.compile(
    r"^(?P<timestamp>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC):[^:]+:(?P<userdb>[^:]+):(?:\[\d+\]:)?(?P<level>FATAL|ERROR|PANIC):\s+(?P<message>.+)$",
    re.MULTILINE
)

def test_parsing():
    if not os.path.exists(LOG_FILE):
        print(f"Error: {LOG_FILE} not found.")
        return

    with open(LOG_FILE, 'r') as f:
        log_data = f.read()

    print("--- Testing Original Regex ---")
    matches = ORIGINAL_REGEX.findall(log_data)
    print(f"Found {len(matches)} matches.")
    for m in matches:
        print(m)

    print("\n--- Testing New Regex ---")
    matches_new = NEW_REGEX.findall(log_data)
    print(f"Found {len(matches_new)} matches.")
    for m in matches_new:
        print(m)

if __name__ == "__main__":
    test_parsing()
