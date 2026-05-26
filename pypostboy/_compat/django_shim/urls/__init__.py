"""Small URL pattern implementation for Django-style ``path`` routing."""

import re


class URLPattern:
    def __init__(self, route, view):
        self.route = route
        self.view = view
        self.regex, self.converters = self._compile(route)

    def _compile(self, route):
        converters = {}
        pattern = '^'
        i = 0
        for part in route.strip('/').split('/') if route else ['']:
            if part == '':
                continue
            if part.startswith('<') and part.endswith('>'):
                conv, name = part[1:-1].split(':', 1)
                converters[name] = conv
                if conv == 'int':
                    pattern += rf'/(?P<{name}>\d+)'
                elif conv == 'path':
                    pattern += rf'/(?P<{name}>.+)'
                else:
                    pattern += rf'/(?P<{name}>[^/]+)'
            else:
                pattern += '/' + re.escape(part)
        if route == '':
            pattern = '^/'
        return re.compile(pattern + '$'), converters

    def match(self, request_path):
        match = self.regex.match(request_path)
        if not match:
            return None
        kwargs = match.groupdict()
        for name, conv in self.converters.items():
            if conv == 'int':
                kwargs[name] = int(kwargs[name])
        return kwargs


def path(route, view):
    return URLPattern(route, view)
