"""Import helpers."""

import importlib


def import_string(dotted_path):
    module_path, class_name = dotted_path.rsplit('.', 1)
    return getattr(importlib.import_module(module_path), class_name)
