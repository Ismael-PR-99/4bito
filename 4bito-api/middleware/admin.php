<?php
// Thin wrapper — la lógica real está en config/bootstrap.php (requireAdminAuth)
// Mantenido por compatibilidad: los endpoints hacen require_once('../middleware/admin.php') + requireAdmin()

function requireAdmin(): array {
    return requireAdminAuth();
}
