"""Tests for converting cURL commands into request payloads."""

import pytest

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


def test_parse_curl_handles_multiline_commands_with_quoted_json_body():
    result = parse_curl_to_request(
        "curl \\\n"
        "  --request post \\\n"
        "  --url 'https://api.example.test/widgets' \\\n"
        "  --header 'Content-Type: application/json' \\\n"
        "  --data-raw '{\"name\":\"Ada Lovelace\",\"active\":true}'"
    )

    assert result["method"] == "POST"
    assert result["url"] == "https://api.example.test/widgets"
    assert result["headers"] == [
        {"key": "Content-Type", "value": "application/json"}
    ]
    assert result["body_type"] == "json"
    assert result["body_content"] == '{"name":"Ada Lovelace","active":true}'


def test_parse_curl_handles_escaped_quotes_in_double_quoted_json_body():
    result = parse_curl_to_request(
        'curl -d "{\\"message\\":\\"She said \\\\\\\"hello\\\\\\\"\\"}" '
        'https://api.example.test/messages'
    )

    assert result["method"] == "POST"
    assert result["url"] == "https://api.example.test/messages"
    assert result["body_type"] == "json"
    assert result["body_content"] == '{"message":"She said \\"hello\\""}'


def test_parse_curl_handles_tabs_between_arguments():
    result = parse_curl_to_request(
        "curl\t-X\tPUT\t-H\t'Accept: application/json'\t"
        "--data\t'{\"status\":\"ok\"}'\thttps://api.example.test/status"
    )

    assert result["method"] == "PUT"
    assert result["url"] == "https://api.example.test/status"
    assert result["headers"] == [{"key": "Accept", "value": "application/json"}]
    assert result["body_type"] == "json"
    assert result["body_content"] == '{"status":"ok"}'


def test_parse_curl_raises_clear_validation_error_for_unclosed_quotes():
    with pytest.raises(ValueError, match="Invalid cURL command: unable to parse"):
        parse_curl_to_request("curl -d '{\"name\":\"Ada\" https://api.example.test/widgets")
