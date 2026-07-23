# Large response policy

PyPostBoy keeps large proxied responses safe for the local UI by separating backend copy limits from frontend inline-rendering limits.

- Backend proxy responses are capped by `MAX_RESPONSE_BODY_BYTES` in `pypostboy/services/proxy_service.py` before the body is serialized into JSON for the browser. The response payload includes `originalSize`, `truncatedSize`, and `isTruncated` so clients know the upstream byte count and whether the body was shortened.
- The frontend response viewer renders bodies inline only up to `MAX_INLINE_RENDERED_RESPONSE_BYTES` in `frontend/src/components/ResponseViewer.jsx`. Larger bodies use a plain truncated preview with a size/truncation notice instead of mounting CodeMirror for the full body.
- Copying response bodies is capped by `MAX_COPIED_RESPONSE_BYTES` in `frontend/src/components/ResponseViewer.jsx` to avoid pushing unexpectedly large strings to the system clipboard.

These limits are intentionally documented next to the implementation constants so changes remain visible to backend and frontend maintainers. Update the tests whenever a limit changes.
