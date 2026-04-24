import { storageAPI } from '@core/storage/StorageAPI'

export interface Tag {
  id: number
  name: string
  color: string | null
  created_at: string
}

export interface TagLink {
  tag_id: number
  entity_type: string
  entity_id: string
}

const VALID_NAME = /^[\p{L}\p{N}_\- ]{1,40}$/u
const VALID_COLOR = /^#[0-9a-fA-F]{6}$/

function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

function assertName(name: string): void {
  if (!VALID_NAME.test(name)) {
    throw new Error('Nombre de tag inválido (1-40 caracteres alfanuméricos, espacio, guion o guion bajo)')
  }
}

function assertColor(color: string | null | undefined): void {
  if (color != null && !VALID_COLOR.test(color)) {
    throw new Error('Color de tag inválido (formato #RRGGBB)')
  }
}

function assertEntityType(type: string): void {
  if (!/^[a-z][a-z0-9_]{0,40}$/.test(type)) {
    throw new Error('entity_type inválido')
  }
}

export const tagsService = {
  async list(): Promise<Tag[]> {
    return storageAPI.query<Tag>('SELECT * FROM core_tags ORDER BY name ASC')
  },

  async create(name: string, color: string | null = null): Promise<Tag> {
    assertName(name)
    assertColor(color)
    const normalized = normalizeName(name)
    await storageAPI.execute(
      'INSERT OR IGNORE INTO core_tags (name, color) VALUES (?, ?)',
      [normalized, color],
    )
    const rows = await storageAPI.query<Tag>('SELECT * FROM core_tags WHERE name = ?', [normalized])
    if (!rows[0]) throw new Error('No se pudo crear el tag')
    return rows[0]
  },

  async rename(id: number, name: string): Promise<void> {
    assertName(name)
    await storageAPI.execute('UPDATE core_tags SET name = ? WHERE id = ?', [normalizeName(name), id])
  },

  async setColor(id: number, color: string | null): Promise<void> {
    assertColor(color)
    await storageAPI.execute('UPDATE core_tags SET color = ? WHERE id = ?', [color, id])
  },

  async remove(id: number): Promise<void> {
    await storageAPI.execute('DELETE FROM core_tags WHERE id = ?', [id])
  },

  async link(tagId: number, entityType: string, entityId: string | number): Promise<void> {
    assertEntityType(entityType)
    await storageAPI.execute(
      'INSERT OR IGNORE INTO core_tag_links (tag_id, entity_type, entity_id) VALUES (?, ?, ?)',
      [tagId, entityType, String(entityId)],
    )
  },

  async unlink(tagId: number, entityType: string, entityId: string | number): Promise<void> {
    assertEntityType(entityType)
    await storageAPI.execute(
      'DELETE FROM core_tag_links WHERE tag_id = ? AND entity_type = ? AND entity_id = ?',
      [tagId, entityType, String(entityId)],
    )
  },

  async forEntity(entityType: string, entityId: string | number): Promise<Tag[]> {
    assertEntityType(entityType)
    return storageAPI.query<Tag>(
      `SELECT t.* FROM core_tags t
       INNER JOIN core_tag_links l ON l.tag_id = t.id
       WHERE l.entity_type = ? AND l.entity_id = ?
       ORDER BY t.name ASC`,
      [entityType, String(entityId)],
    )
  },

  async entitiesForTag(tagId: number): Promise<TagLink[]> {
    return storageAPI.query<TagLink>(
      'SELECT tag_id, entity_type, entity_id FROM core_tag_links WHERE tag_id = ?',
      [tagId],
    )
  },
}
