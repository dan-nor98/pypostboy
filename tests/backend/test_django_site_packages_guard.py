"""Guard against importing a repository-local Django compatibility runtime."""

from pathlib import Path


def test_django_import_resolves_to_site_packages():
    import django

    django_path = Path(django.__file__).resolve()
    repo_root = Path(__file__).resolve().parents[2]
    path_parts = set(django_path.parts)

    assert repo_root not in django_path.parents, (
        f"Expected site-packages django, but loaded local module from {django_path}"
    )
    assert "site-packages" in path_parts or "dist-packages" in path_parts, (
        f"Expected installed Django from site-packages, but loaded {django_path}"
    )
