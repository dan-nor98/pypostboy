"""Minimal settings proxy."""

import importlib
import os


class LazySettings:
    configured = False

    def _setup(self):
        if self.configured:
            return
        module_name = os.environ.get('DJANGO_SETTINGS_MODULE')
        if not module_name:
            raise RuntimeError('DJANGO_SETTINGS_MODULE is not set')
        module = importlib.import_module(module_name)
        for name in dir(module):
            if name.isupper():
                setattr(self, name, getattr(module, name))
        self.configured = True

    def __getattr__(self, name):
        self._setup()
        return self.__dict__[name]

    def __setattr__(self, name, value):
        object.__setattr__(self, name, value)


settings = LazySettings()
