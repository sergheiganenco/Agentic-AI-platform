import React from 'react';
import type { MetadataColumn } from '../types/agenticAi';

const MetadataTable: React.FC<{ columns: MetadataColumn[] }> = ({ columns }) => (
  <table>
    <thead>
      <tr>
        <th>Table</th>
        <th>Column</th>
        <th>Type</th>
        <th>Nullable</th>
        <th>Primary Key</th>
        <th>PII</th>
      </tr>
    </thead>
    <tbody>
      {columns.map(col => (
        <tr key={`${col.table}-${col.name}`}>
          <td>{col.table}</td>
          <td>{col.name}</td>
          <td>{col.types.join(', ')}</td>
          <td>{col.nullable ? 'Yes' : 'No'}</td>
          <td>{col.primary_key ? 'Yes' : 'No'}</td>
          <td>{col.pii ? <span style={{ color: 'red' }}>PII</span> : null}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

export default MetadataTable;
