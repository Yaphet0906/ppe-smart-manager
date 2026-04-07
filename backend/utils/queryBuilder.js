/**
 * 查询构建器 - 统一构建安全的SQL查询
 * 避免字符串拼接导致的SQL注入风险
 */

class ItemQueryBuilder {
  constructor(tenantId) {
    this.tenantId = tenantId;
    this.conditions = ['tenant_id = ?'];
    this.params = [tenantId];
    this.orderBy = 'id DESC';
    this.selectFields = '*';
    this.limit = null;
    this.offset = null;
  }

  withWarehouse(warehouseId) {
    if (warehouseId && warehouseId !== 'null' && warehouseId !== '') {
      this.conditions.push('warehouse_id = ?');
      this.params.push(parseInt(warehouseId));
    }
    return this;
  }

  withCategory(categoryCode) {
    if (categoryCode) {
      this.conditions.push('category_code = ?');
      this.params.push(categoryCode);
    }
    return this;
  }

  withSearch(keyword) {
    if (keyword && keyword.trim()) {
      this.conditions.push('(name LIKE ? OR specification LIKE ?)');
      const pattern = `%${keyword.trim()}%`;
      this.params.push(pattern, pattern);
    }
    return this;
  }

  withStockStatus(status) {
    switch (status) {
      case 'normal':
        this.conditions.push('quantity > safety_stock');
        break;
      case 'low':
        this.conditions.push('quantity <= safety_stock AND quantity > 0');
        break;
      case 'critical':
        this.conditions.push('quantity = 0');
        break;
    }
    return this;
  }

  excludeDeleted() {
    this.conditions.push('deleted_at IS NULL');
    return this;
  }

  withPagination(page, limit) {
    this.page = parseInt(page) || 1;
    this.limit = parseInt(limit) || 100;
    this.offset = (this.page - 1) * this.limit;
    return this;
  }

  select(fields) {
    this.selectFields = Array.isArray(fields) ? fields.join(', ') : fields;
    return this;
  }

  orderByField(field, direction = 'DESC') {
    this.orderBy = `${field} ${direction}`;
    return this;
  }

  build() {
    const whereClause = this.conditions.join(' AND ');
    let sql = `SELECT ${this.selectFields} FROM inv_items WHERE ${whereClause}`;
    
    if (this.orderBy) sql += ` ORDER BY ${this.orderBy}`;
    if (this.limit) {
      sql += ` LIMIT ? OFFSET ?`;
      this.params.push(this.limit, this.offset);
    }

    return {
      sql,
      params: [...this.params],
      countSql: `SELECT COUNT(*) as total FROM inv_items WHERE ${whereClause}`,
      countParams: this.limit ? this.params.slice(0, -2) : [...this.params]
    };
  }
}

module.exports = { ItemQueryBuilder };
