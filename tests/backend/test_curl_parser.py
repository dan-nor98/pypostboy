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
    assert result["body_type"] == "form-urlencoded"
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


def test_parse_curl_handles_attached_short_request_method():
    result = parse_curl_to_request(
        "curl -XPOST https://api.example.test/widgets -d '{\"name\":\"Ada\"}'"
    )

    assert result["method"] == "POST"
    assert result["url"] == "https://api.example.test/widgets"
    assert result["body_type"] == "json"
    assert result["body_content"] == '{"name":"Ada"}'


def test_parse_curl_handles_equals_request_and_url_options():
    result = parse_curl_to_request(
        "curl --request=PATCH --url=https://api.example.test/widgets/1"
    )

    assert result["method"] == "PATCH"
    assert result["url"] == "https://api.example.test/widgets/1"
    assert result["body_type"] == "none"


def test_parse_curl_head_flags_set_head_method():
    short_result = parse_curl_to_request("curl -I https://api.example.test/widgets")
    long_result = parse_curl_to_request("curl --head https://api.example.test/widgets")

    assert short_result["method"] == "HEAD"
    assert short_result["url"] == "https://api.example.test/widgets"
    assert long_result["method"] == "HEAD"
    assert long_result["url"] == "https://api.example.test/widgets"


def test_parse_curl_get_flags_keep_data_requests_as_get():
    short_result = parse_curl_to_request(
        "curl -G -d q=postboy https://api.example.test/search"
    )
    long_result = parse_curl_to_request(
        "curl --get --data q=postboy https://api.example.test/search"
    )

    assert short_result["method"] == "GET"
    assert short_result["url"] == "https://api.example.test/search"
    assert short_result["body_content"] == "q=postboy"
    assert long_result["method"] == "GET"
    assert long_result["url"] == "https://api.example.test/search"
    assert long_result["body_content"] == "q=postboy"


def test_parse_curl_consumes_ignored_options_before_url():
    result = parse_curl_to_request(
        "curl --connect-timeout 5 --max-time=10 -o /tmp/out.txt "
        "--output=/tmp/out2.txt -A 'Postboy Agent' --user-agent=Other "
        "--referer https://referer.example.test https://api.example.test/widgets"
    )

    assert result["method"] == "GET"
    assert result["url"] == "https://api.example.test/widgets"
    assert result["headers"] == []


def test_parse_curl_converts_inline_cookie_options_to_cookie_header():
    result = parse_curl_to_request(
        "curl -b 'session=abc' --cookie='theme=light' https://api.example.test/widgets"
    )

    assert result["url"] == "https://api.example.test/widgets"
    assert result["headers"] == [
        {"key": "Cookie", "value": "session=abc; theme=light"}
    ]


def test_parse_curl_does_not_convert_cookie_file_to_cookie_header():
    result = parse_curl_to_request(
        "curl --cookie cookies.txt https://api.example.test/widgets"
    )

    assert result["url"] == "https://api.example.test/widgets"
    assert result["headers"] == []


def test_parse_curl_accumulates_repeated_data_flags_with_ampersands():
    result = parse_curl_to_request(
        "curl https://api.example.test/search -d q=postboy --data page=2 "
        "--data-raw sort=created"
    )

    assert result["method"] == "POST"
    assert result["body_type"] == "form-urlencoded"
    assert result["body_content"] == "q=postboy&page=2&sort=created"
    assert "form_data" not in result


def test_parse_curl_accumulates_data_urlencode_as_structured_form_data():
    result = parse_curl_to_request(
        "curl https://api.example.test/search "
        "--data-urlencode 'q=Ada Lovelace' --data-urlencode 'page=2'"
    )

    assert result["method"] == "POST"
    assert result["body_type"] == "form-urlencoded"
    assert result["body_content"] == "q=Ada+Lovelace&page=2"
    assert result["form_data"] == [
        {"key": "q", "value": "Ada Lovelace"},
        {"key": "page", "value": "2"},
    ]


def test_parse_curl_infers_xml_body_type():
    result = parse_curl_to_request(
        "curl https://api.example.test/widgets -H 'Content-Type: application/xml' "
        "--data '<widget><name>Ada</name></widget>'"
    )

    assert result["body_type"] == "xml"
    assert result["body_content"] == "<widget><name>Ada</name></widget>"


def test_parse_curl_parses_form_options_as_form_data():
    result = parse_curl_to_request(
        "curl https://api.example.test/upload -F 'name=Ada' --form 'avatar=@ada.png'"
    )

    assert result["method"] == "POST"
    assert result["body_type"] == "form-data"
    assert result["body_content"] == ""
    assert result["form_data"] == [
        {"key": "name", "value": "Ada"},
        {"key": "avatar", "value": "@ada.png"},
    ]
