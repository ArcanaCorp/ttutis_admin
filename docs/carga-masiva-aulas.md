# Carga masiva de aulas

La pantalla **Año escolar → Nueva aula → Carga desde Excel** permite crear varias aulas para el año escolar seleccionado.

## Archivos

- `plantilla-carga-aulas.xlsx`: estructura vacía compatible con el importador.
- `ejemplo-carga-aulas.xlsx`: filas ficticias para mostrar el formato esperado.

En la ventana de importación también se puede descargar una plantilla actualizada.

## Columnas de la primera hoja

La primera hoja del libro es la que se procesa. La fila 1 contiene los encabezados; cada fila posterior representa un aula.

| Columna | Obligatoria | Formato |
| --- | --- | --- |
| `nivel` | Sí | `INITIAL`, `PRIMARY`, `SECONDARY` u `OTHER`. También acepta Inicial, Primaria, Secundaria u Otro. |
| `grado` | Sí | Texto, por ejemplo `1.º`, `2.º` o `3 años`. |
| `seccion` | Sí | Texto, por ejemplo `A`, `B` o `Única`. |
| `orden_grado` | No | Entero mayor que cero para ordenar los grados. |
| `capacidad` | No | Entero mayor que cero. |
| `estado` | No | `ACTIVE` o `INACTIVE`; si se deja vacío, se guarda como `ACTIVE`. |

El importador admite archivos `.xlsx` de hasta 5 MB y 500 filas. Revisa nivel, campos obligatorios, números y aulas duplicadas antes de guardar. Si encuentra errores, corrige el archivo y vuelve a seleccionarlo; no guarda filas parcialmente.

## Ejemplo

| nivel | grado | seccion | orden_grado | capacidad | estado |
| --- | --- | --- | ---: | ---: | --- |
| INITIAL | 3 años | A | 1 | 20 | ACTIVE |
| PRIMARY | 1.º | A | 1 | 30 | ACTIVE |
| PRIMARY | 1.º | B | 1 | 30 | ACTIVE |
| SECONDARY | 1.º | A | 1 | 32 | ACTIVE |

Las aulas se crean en el año escolar seleccionado y en la institución de la sesión. No incluyas `institution_id` ni `academic_year_id` en la hoja: el sistema los asigna al guardar.
