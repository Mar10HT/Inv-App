# Product

## Register

product

## Users

Administradores y gerentes de bodega que usan Obsid principalmente para análisis, reporteo y toma de decisiones estratégicas sobre el inventario. Sesiones largas en escritorio (monitor 24-27"), foco en exportación de reportes, lectura de métricas, gestión de usuarios, configuración de roles y revisión de auditoría. El uso operativo de piso (QR, transferencias entre bodegas) existe pero es secundario al análisis.

## Product Purpose

Obsid es un sistema de gestión de inventario multi-bodega con control de acceso granular. Su propósito es darle al administrador una visión consolidada y confiable del estado del inventario en todas las bodegas, con trazabilidad completa (auditoría, transacciones, préstamos) y capacidad de exportar reportes ejecutivos. El éxito se mide en cuánto reduce el tiempo de respuesta del administrador para responder "¿dónde está esto?", "¿quién hizo qué?" y "¿qué falta?".

## Brand Personality

**Confiable, profesional, sólido.** Voz directa sin adjetivos vacíos. Tono institucional pero no aburrido. Debe sentirse como una herramienta seria que respeta el tiempo del usuario y no exagera con animaciones ni decoración. La densidad de información es bienvenida cuando ayuda al análisis. El logo Obsid (verde profundo `#4d7c6f → #2d5247`) ya marca el tono: tierra firme, no neón.

## Anti-references

- **ERP corporativo clásico (SAP, Odoo):** tablas grises infinitas, formularios anchos sin jerarquía, dropdowns nativos, paleta apagada sin intención.
- **SaaS genérico con gradientes morados:** purple-to-pink, hero metric templates, fonts de moda sin propósito, AI-slop palette.
- **Material Design vanilla:** que se note que es Angular Material sin customizar. Botones flat azules, ripples por todos lados, FAB innecesarios, tipografía Roboto sin trabajar.
- **Dashboard cliché (big number + 3 cards):** layouts de plantilla Tailwind UI, todos los componentes del mismo tamaño, hero-metric en cada esquina.

## Design Principles

1. **Densidad con jerarquía** — los administradores quieren ver datos, no aire. Pero cada bloque denso debe tener una jerarquía tipográfica clara (peso, tamaño, color de neutro). Densidad sin jerarquía es ERP.
2. **El verde Obsid hace el trabajo** — la paleta es restringida: neutros tintados al verde + el acento de marca. No agregar nuevos colores "para variar". Estados (error, warning, success) son los únicos otros tonos permitidos.
3. **Respeta el tiempo del experto** — cero diálogos modales para confirmaciones banales, cero onboarding tutoriales, cero copy redundante ("Click here to..."). Atajos de teclado (Ctrl+K command palette ya existe). Affordances visibles pero no gritonas.
4. **Trazable por construcción** — toda acción importante deja rastro visible (audit log, timestamps, user attribution). El diseño debe hacer evidente el "quién/cuándo/qué" sin que el usuario tenga que buscarlo.
5. **Oscuro porque tiene sentido** — el tema oscuro es default porque el usuario pasa horas frente a la pantalla analizando datos. No es estética. Light mode existe pero el oscuro es el escenario primario.

## Accessibility & Inclusion

- **WCAG AA** como mínimo en toda la app (contraste 4.5:1 para texto normal, 3:1 para texto grande y elementos UI).
- **Navegación por teclado completa** — administradores que pasan muchas horas en la app no deberían depender del mouse. Tab order lógico, focus indicators visibles (más allá del default azul de browser), atajos para acciones frecuentes.
- **Tamaño de touch target ≥ 44×44px** en cualquier vista que pueda usarse en tablet (vistas operativas de bodega).
- **Reduce motion respetado** — animaciones de entrada decorativas deben desactivarse con `prefers-reduced-motion`.
- **Internacionalización ES/EN** ya soportada vía ngx-translate — toda copia debe usar claves de traducción, no strings hardcoded.
