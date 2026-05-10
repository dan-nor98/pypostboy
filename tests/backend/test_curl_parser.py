"""Tests for converting cURL commands into request payloads."""

from pypostboy.services.curl_parser import parse_curl_to_request


def test_parse_curl_extracts_method_url_headers_and_json_body():
    result = parse_curl_to_request(
        "curl -X PATCH 'https://api.example.test/widgets/1' "
        "-H 'Accept: application/json' -H 'Content-Type: application/json' "
        "--data-raw '{\"name\":\"Ada\"}'"
    )

    assert result == {
        "method": "PATCH",
        "url": "https://api.example.test/widgets/1",
        "headers": [
            {"key": "Accept", "value": "application/json"},
            {"key": "Content-Type", "value": "application/json"},
        ],
        "body_type": "json",
        "body_content": '{"name":"Ada"}',
    }


def test_parse_curl_defaults_post_when_data_is_supplied_without_method():
    result = parse_curl_to_request(
        "curl --url https://api.example.test/search -u user:secret -d 'q=postboy'"
    )

    assert result["method"] == "POST"
    assert result["url"] == "https://api.example.test/search"
    assert result["body_type"] == "text"
    assert result["body_content"] == "q=postboy"
    assert result["headers"] == [
        {"key": "Authorization", "value": "Basic dXNlcjpzZWNyZXQ="}
    ]
