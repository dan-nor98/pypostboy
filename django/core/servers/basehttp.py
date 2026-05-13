"""Development server shim."""

from wsgiref.simple_server import make_server


def run(addr, port, wsgi_handler):
    with make_server(addr, port, wsgi_handler) as server:
        server.serve_forever()
