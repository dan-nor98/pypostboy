"""CSRF decorator shims."""


def csrf_exempt(view_func):
    view_func.csrf_exempt = True
    return view_func
