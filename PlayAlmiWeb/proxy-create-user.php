<?php
header('Content-Type: application/json; charset=utf-8');

function save_local_profile_photo(string &$rawBody): void
{
    $input = json_decode($rawBody, true);
    if (!is_array($input) || !isset($input['foto_perfil'])) {
        return;
    }

    $value = trim((string) $input['foto_perfil']);
    if ($value === '' || stripos($value, 'data:image/') !== 0) {
        return;
    }

    if (!preg_match('/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/', $value, $matches)) {
        return;
    }

    $mimeType = strtolower($matches[1]);
    $base64Data = $matches[2];
    $binary = base64_decode($base64Data, true);
    if ($binary === false) {
        return;
    }

    $extension = 'jpg';
    if ($mimeType === 'image/png') $extension = 'png';
    if ($mimeType === 'image/webp') $extension = 'webp';
    if ($mimeType === 'image/gif') $extension = 'gif';

    $safeName = preg_replace('/[^a-z0-9_-]+/i', '-', (string) ($input['username'] ?? 'perfil'));
    $safeName = trim(strtolower($safeName), '-');
    if ($safeName === '') {
        $safeName = 'perfil';
    }

    $directory = __DIR__ . '/fotoperfil';
    if (!is_dir($directory)) {
        @mkdir($directory, 0775, true);
    }

    $fileName = $safeName . '-' . bin2hex(random_bytes(8)) . '.' . $extension;
    $filePath = $directory . '/' . $fileName;

    if (@file_put_contents($filePath, $binary) === false) {
        return;
    }

    $input['foto_perfil'] = '/fotoperfil/' . $fileName;
    $rawBody = json_encode($input);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'status' => 'error',
        'message' => 'Metodo no permitido'
    ]);
    exit;
}

$target = getenv('PLAYALMI_API_CREATE_USER_URL');
if (!$target) {
    $target = 'http://20.203.222.95:8080/api/users';
}

$rawBody = file_get_contents('php://input');
if ($rawBody === false || trim($rawBody) === '') {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Body vacio'
    ]);
    exit;
}

save_local_profile_photo($rawBody);

$headers = [
    'Accept: application/json',
    'Content-Type: application/json'
];

if (function_exists('curl_init')) {
    $ch = curl_init($target);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $rawBody);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);

    $response = curl_exec($ch);
    $statusCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = $response === false ? curl_error($ch) : '';
    curl_close($ch);

    if ($error !== '') {
        http_response_code(502);
        echo json_encode([
            'status' => 'error',
            'message' => 'No se pudo conectar con la API remota: ' . $error
        ]);
        exit;
    }

    http_response_code($statusCode > 0 ? $statusCode : 200);
    echo $response;
    exit;
}

$context = stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => implode("\r\n", $headers),
        'content' => $rawBody,
        'timeout' => 10,
        'ignore_errors' => true
    ]
]);

$response = @file_get_contents($target, false, $context);
if ($response === false) {
    http_response_code(502);
    echo json_encode([
        'status' => 'error',
        'message' => 'No se pudo conectar con la API remota.'
    ]);
    exit;
}

$statusCode = 200;
if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $matches)) {
    $statusCode = (int) $matches[1];
}

http_response_code($statusCode);
echo $response;
