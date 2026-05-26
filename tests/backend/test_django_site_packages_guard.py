"""Guard against importing the repository Django shim as top-level django."""

from pathlib import Path


def test_django_import_resolves_to_site_packages():
    import django

    django_path = Path(django.__file__).resolve()
    repo_root = Path(__file__).resolve().parents[2]

    assert repo_root not in django_path.parents, (
        f"Expected site-packages django, but loaded local module from {django_path}"
    )
