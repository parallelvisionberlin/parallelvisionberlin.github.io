# Nina zero-cost local test mode

From Windows PowerShell, open the repository folder and run:

```powershell
py -m http.server 8000 --bind 127.0.0.1
```

Then open exactly:

```text
http://127.0.0.1:8000/?nina_mock=1
```

Mock mode activates only on `localhost` or `127.0.0.1` when the query parameter
`nina_mock=1` is also present. It cannot activate on the production website or a
GitHub Pages hostname.

Use the normal **TRANSMIT TO 2063** flow and the normal access key. An incorrect
key should show the access-denied state. After a correct key, approve camera and
microphone access, then use the four controls in the simulated call window to
test conversation start, conversation end, a temporary error, and reset.

The browser console must report all three of these values as zero:

```text
TAVUS NETWORK REQUESTS: 0
TAVUS ELEMENTS: 0
TAVUS SCRIPTS: 0
```
