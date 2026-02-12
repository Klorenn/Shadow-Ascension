# Craftpix – Vampire 4-direction pixel character

Pack original: `craftpix-net-208004-free-vampire-4-direction-pixel-character-sprite-pack`.

## Dónde se cargan los assets

- **Texturas:** los PNG de esta carpeta se importan automáticamente al abrir el proyecto en Godot (`.godot/imported/`).
- **SpriteFrames:** `vampire_sprite_frames.tres` define las animaciones (idle, walk, hit, death) usando regiones 64×64 sobre cada spritesheet.
- **Uso en juego:** la escena `Player` (`res://scenes/player.tscn`) usa este recurso en el nodo `AnimatedSprite2D`.

## Cómo cambiar a otros sprites del mismo pack

1. **Usar Vampires2 o Vampires3:** copia los PNG de `PNG/Vampires2/With_shadow/` o `Vampires3/With_shadow/` aquí (mismo nombre o renómbralos). Luego en `vampire_sprite_frames.tres` cambia las rutas `path="res://assets/craftpix/vampire_4dir/..."` para que apunten a los nuevos archivos.
2. **Cambiar solo una animación:** abre `vampire_sprite_frames.tres` en el editor, selecciona la animación y en cada frame (AtlasTexture) cambia el `atlas` a la nueva textura o ajusta `region` si el tamaño de frame es distinto.
3. **Otro tamaño de frame:** si las hojas son distintas (p. ej. 32×32), edita las `region = Rect2(x, y, ancho, alto)` en el .tres para que coincidan con la cuadrícula del PNG.

## Escena de prueba

Abre `res://scenes/TestCraftpixVampire.tscn` y ejecuta la escena actual (F6) para ver un frame del vampiro en pantalla.
