import React, { useState } from 'react';
import axios from 'axios';

function KaragirForm() {
  const [actionType, setActionType] = useState('in');
  const [formData, setFormData] = useState({
    metalType: '',
    ornamentName: '',
    labourCharge: '',
    karatorHUID: '',
    grossWeight: '',
    netWeight: '',
    subtype: '',
    karagirName: '',
    status: '',
    remarks: '',
    purity: '',
    grams: ''
  });

  // Helper to get token from localStorage
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`
    };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    axios.post(
      '/api/karagirleisures',
      { actionType, ...formData },
      { headers: getAuthHeaders() }
    )
      .then(() => alert('Karagir entry submitted'))
      .catch((err) => console.error(err));
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Karagir In-Out</h3>
      <label>
        Action:
        <select value={actionType} onChange={(e) => setActionType(e.target.value)}>
          <option value="in">In</option>
          <option value="out">Out</option>
        </select>
      </label>

      {/* Fields for "in" action */}
      {actionType === 'in' && (
        <div>
          <input
            type="text"
            placeholder="Metal Type"
            value={formData.metalType}
            onChange={(e) => setFormData({ ...formData, metalType: e.target.value })}
          />
          <input
            type="text"
            placeholder="Ornament Name"
            value={formData.ornamentName}
            onChange={(e) => setFormData({ ...formData, ornamentName: e.target.value })}
          />
          <input
            type="number"
            placeholder="Labour Charge"
            value={formData.labourCharge}
            onChange={(e) => setFormData({ ...formData, labourCharge: e.target.value })}
          />
          <input
            type="text"
            placeholder="Karator HUID"
            value={formData.karatorHUID}
            onChange={(e) => setFormData({ ...formData, karatorHUID: e.target.value })}
          />
          <input
            type="number"
            placeholder="Gross Weight"
            value={formData.grossWeight}
            onChange={(e) => setFormData({ ...formData, grossWeight: e.target.value })}
          />
          <input
            type="number"
            placeholder="Net Weight"
            value={formData.netWeight}
            onChange={(e) => setFormData({ ...formData, netWeight: e.target.value })}
          />
          <input
            type="text"
            placeholder="Subtype"
            value={formData.subtype}
            onChange={(e) => setFormData({ ...formData, subtype: e.target.value })}
          />
          <input
            type="text"
            placeholder="Karagir Name"
            value={formData.karagirName}
            onChange={(e) => setFormData({ ...formData, karagirName: e.target.value })}
          />
          <input
            type="text"
            placeholder="Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          />
          <input
            type="text"
            placeholder="Remarks"
            value={formData.remarks}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
          />
        </div>
      )}

      {/* Fields for "out" action */}
      {actionType === 'out' && (
        <div>
          <input
            type="text"
            placeholder="Metal Type"
            value={formData.metalType}
            onChange={(e) => setFormData({ ...formData, metalType: e.target.value })}
          />
          <input
            type="number"
            placeholder="Purity"
            value={formData.purity}
            onChange={(e) => setFormData({ ...formData, purity: e.target.value })}
          />
          <input
            type="number"
            placeholder="Grams"
            value={formData.grams}
            onChange={(e) => setFormData({ ...formData, grams: e.target.value })}
          />
          <input
            type="text"
            placeholder="Karagir Name"
            value={formData.karagirName}
            onChange={(e) => setFormData({ ...formData, karagirName: e.target.value })}
          />
          <input
            type="text"
            placeholder="Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          />
          <input
            type="text"
            placeholder="Remarks"
            value={formData.remarks}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
          />
        </div>
      )}

      <button type="submit">Submit Karagir Entry</button>
    </form>
  );
}

export default KaragirForm;
