<?php
header('Content-Type: application/json; charset=utf-8');

$target = getenv('PLAYALMI_API_USERS_URL');
if (!$target) {
    $target = 'http://192.168.0.84:8080/api/users';
}

function error_response(int $status, string $message): void
{
    http_response_code($status);
    echo json_encode([
        'status' => 'error',
        'message' => $message,
        'data' => []
    ]);
    exit;
}

$headers = [
    'Accept: application/json'
];

if (function_exists('curl_init')) {
    $ch = curl_init($target);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);

    $response = curl_exec($ch);
    $statusCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = $response === false ? curl_error($ch) : '';
    curl_close($ch);

    if ($error !== '') {
        error_response(502, 'No se pudo conectar con la API remota: ' . $error);
    }

    if ($statusCode < 200 || $statusCode >= 300) {
        error_response($statusCode > 0 ? $statusCode : 502, 'La API remota devolvio un error HTTP.');
    }

    echo $response;
    exit;
}

$context = stream_context_create([
    'http' => [
        'method' => 'GET',
        'header' => implode("\r\n", $headers),
        'timeout' => 10,
        'ignore_errors' => true
    ]
]);

$response = @file_get_contents($target, false, $context);
if ($response === false) {
    error_response(502, 'No se pudo conectar con la API remota.');
}

$statusCode = 0;
if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $matches)) {
    $statusCode = (int) $matches[1];
}

if ($statusCode < 200 || $statusCode >= 300) {
    error_response($statusCode > 0 ? $statusCode : 502, 'La API remota devolvio un error HTTP.');
}

echo $response;
