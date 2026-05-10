export function getBlankState() {
    return {
        method:       'GET',
        url:          '',
        headers:      [],
        body_type:    'none',
        body_content: '',
        form_data:    [],
        auth_type:    'none',
        auth_data:    {},
        body_raw_type: 'application/json',
        response_status: null,
        response_status_text: '',
        response_headers: '',
        response_body: '',
        response_time_ms: null,
        response_size: ''
    };
}
