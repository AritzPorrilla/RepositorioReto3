#!/bin/bash

# 1. Configuración de carpetas y base de datos
CARPETA_DESTINO="/var/www/html/playAlmi/RepositorioReto3/API/backups"
FECHA=$(date +"%Y-%m-%d_%H-%M")
NOMBRE_CARPETA="backup_$FECHA"
BASE_DATOS="PlayAlmi"

# 2. Crear la carpeta de backups si no existe previamente
mkdir -p $CARPETA_DESTINO

# 3. Ejecutar la copia de seguridad (SOLO de la base de datos PlayAlmi)
mongodump --db=$BASE_DATOS --out=$CARPETA_DESTINO/$NOMBRE_CARPETA

# 4. Comprimir la copia en un archivo .tar.gz
tar -czf $CARPETA_DESTINO/$NOMBRE_CARPETA.tar.gz -C $CARPETA_DESTINO $NOMBRE_CARPETA

# 5. Borrar la carpeta sin comprimir
rm -rf $CARPETA_DESTINO/$NOMBRE_CARPETA

# 6. MANTENIMIENTO: Borrar copias de seguridad de más de 7 días
find $CARPETA_DESTINO -type f -name "*.tar.gz" -mtime +7 -exec rm {} \;
