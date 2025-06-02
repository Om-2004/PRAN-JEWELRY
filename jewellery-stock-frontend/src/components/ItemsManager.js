// src/components/ItemsManager.js
import React, { useState } from 'react';
import './ItemsManager.css';

function ItemsManager() {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [updateId, setUpdateId] = useState(null);

  // For both Update and Create, we share a similar form structure.
  // We’ll control which fields are shown based on create vs. update.
  const emptyForm = {
    jewelleryName: '',
    metalType: '',
    subtype: '',
    karatOrHUID: '',
    grossWeight: '',
    netWeight: '',
    sourceType: '',
    labourCharge: ''
  };
  const [formData, setFormData] = useState({ ...emptyForm });

  // Helper to grab the JWT from localStorage and build headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // 0) CREATE A NEW ITEM → opens a modal form
  // ──────────────────────────────────────────────────────────────────────────────
  const handleCreateNew = () => {
    setFormData({ ...emptyForm });
    setShowCreateModal(true);
  };

  const handleCreateSubmit = () => {
    // Build payload exactly as schema expects
    const payload = {
      jewelleryName: formData.jewelleryName,
      metalType: formData.metalType,
      subtype: formData.subtype,
      karatOrHUID: formData.karatOrHUID,
      grossWeight: parseFloat(formData.grossWeight),
      netWeight: parseFloat(formData.netWeight),
      sourceType: formData.sourceType,
      labourCharge: parseFloat(formData.labourCharge)
    };

    fetch('/api/items', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Create failed');
        }
        return res.json();
      })
      .then((newItem) => {
        // Add the newly created item into our state list
        setItems((prev) => [newItem, ...prev]);
        setShowCreateModal(false);
      })
      .catch((err) => {
        console.error('Error creating item:', err);
        alert('Could not create item. Please check your inputs.');
      });
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // 1) FETCH ALL ITEMS
  // ──────────────────────────────────────────────────────────────────────────────
  const handleGetAll = () => {
    fetch('/api/items', {
      method: 'GET',
      headers: getAuthHeaders()
    })
      .then((res) => res.json())
      .then((data) => {
        setItems(data);
        setSelectedItem(null);
      })
      .catch((err) => console.error('Error fetching items:', err));
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // 2) FETCH A SINGLE ITEM BY ID (prompt‐based)
  // ──────────────────────────────────────────────────────────────────────────────
  const handleGetById = () => {
    const id = prompt('Enter Item _id:');
    if (!id) return;
    fetch(`/api/items/${id}`, {
      method: 'GET',
      headers: getAuthHeaders()
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Item not found or invalid ID');
        }
        return res.json();
      })
      .then((data) => {
        setItems([data]);
        setSelectedItem(data);
      })
      .catch((err) => {
        console.error('Error fetching item:', err);
        alert('Could not fetch item. Please check the ID.');
      });
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // 3) DELETE A SINGLE ITEM BY ID (prompt‐based)
  // ──────────────────────────────────────────────────────────────────────────────
  const handleDeleteById = () => {
    const id = prompt('Enter Item _id to delete:');
    if (!id) return;
    fetch(`/api/items/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Delete failed');
        }
        setItems((prev) => prev.filter((item) => item._id !== id));
        if (selectedItem && selectedItem._id === id) {
          setSelectedItem(null);
        }
      })
      .catch((err) => {
        console.error('Error deleting item:', err);
        alert('Could not delete item. Please check the ID.');
      });
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // 4) FETCH SINGLE ITEM & OPEN MODAL TO UPDATE (prompt‐based)
  // ──────────────────────────────────────────────────────────────────────────────
  const handleUpdateById = () => {
    const id = prompt('Enter Item _id to update:');
    if (!id) return;
    fetch(`/api/items/${id}`, {
      method: 'GET',
      headers: getAuthHeaders()
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Item not found');
        }
        return res.json();
      })
      .then((data) => {
        setFormData({
          jewelleryName: data.jewelleryName || '',
          metalType: data.metalType || '',
          subtype: data.subtype || '',
          karatOrHUID: data.karatOrHUID || '',
          grossWeight: data.grossWeight ?? '',
          netWeight: data.netWeight ?? '',
          sourceType: data.sourceType || '',
          labourCharge: data.labourCharge ?? ''
        });
        setUpdateId(data._id);
        setShowModal(true);
      })
      .catch((err) => {
        console.error('Error fetching item for update:', err);
        alert('Could not load item. Please check the ID.');
      });
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // 5) ROW ACTION — GET FULL INFO
  // ──────────────────────────────────────────────────────────────────────────────
  const handleGetInfo = (id) => {
    fetch(`/api/items/${id}`, {
      method: 'GET',
      headers: getAuthHeaders()
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Item not found');
        }
        return res.json();
      })
      .then((data) => {
        setSelectedItem(data);
      })
      .catch((err) => {
        console.error('Error fetching item info:', err);
        alert('Could not fetch item info.');
      });
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // 6) ROW ACTION — DELETE
  // ──────────────────────────────────────────────────────────────────────────────
  const handleDelete = (id) => {
    fetch(`/api/items/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Delete failed');
        }
        setItems((prev) => prev.filter((item) => item._id !== id));
        if (selectedItem && selectedItem._id === id) {
          setSelectedItem(null);
        }
      })
      .catch((err) => {
        console.error('Error deleting item:', err);
        alert('Could not delete item.');
      });
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // 7) ROW ACTION — OPEN UPDATE MODAL (prefill from item object)
  // ──────────────────────────────────────────────────────────────────────────────
  const handleUpdate = (item) => {
    setFormData({
      jewelleryName: item.jewelleryName || '',
      metalType: item.metalType || '',
      subtype: item.subtype || '',
      karatOrHUID: item.karatOrHUID || '',
      grossWeight: item.grossWeight ?? '',
      netWeight: item.netWeight ?? '',
      sourceType: item.sourceType || '',
      labourCharge: item.labourCharge ?? ''
    });
    setUpdateId(item._id);
    setShowModal(true);
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // 8) HANDLE FORM INPUT CHANGES IN MODAL (both create & update)
  // ──────────────────────────────────────────────────────────────────────────────
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // 9) SUBMIT UPDATED ITEM (PUT `/api/items/:id`) when updating
  // ──────────────────────────────────────────────────────────────────────────────
  const handleUpdateSubmit = () => {
    if (!updateId) return;

    const payload = {
      jewelleryName: formData.jewelleryName,
      metalType: formData.metalType,
      subtype: formData.subtype,
      karatOrHUID: formData.karatOrHUID,
      grossWeight: parseFloat(formData.grossWeight),
      netWeight: parseFloat(formData.netWeight),
      sourceType: formData.sourceType,
      labourCharge: parseFloat(formData.labourCharge)
    };

    fetch(`/api/items/${updateId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Update failed');
        }
        return res.json();
      })
      .then((updatedItem) => {
        setItems((prev) =>
          prev.map((itm) => (itm._id === updatedItem._id ? updatedItem : itm))
        );
        if (selectedItem && selectedItem._id === updatedItem._id) {
          setSelectedItem(updatedItem);
        }
        setShowModal(false);
        setUpdateId(null);
      })
      .catch((err) => {
        console.error('Error updating item:', err);
        alert('Could not update item.');
      });
  };

  const handleModalClose = () => {
    setShowModal(false);
    setUpdateId(null);
  };

  const handleCreateModalClose = () => {
    setShowCreateModal(false);
    setFormData({ ...emptyForm });
  };

  return (
    <div>
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* A) Top Row: five action buttons (including Create)              */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="action-buttons">
        <button onClick={handleCreateNew}>CREATE NEW ITEM</button>
        <button onClick={handleGetAll}>GET ALL ITEMS</button>
        <button onClick={handleGetById}>GET ITEM BY ID</button>
        <button onClick={handleDeleteById}>DELETE ITEM BY ID</button>
        <button onClick={handleUpdateById}>UPDATE ITEM BY ID</button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* B) Items Table (only if we have items in state)                */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {items.length > 0 && (
        <table className="items-table">
          <thead>
            <tr>
              <th>Item ID (_id)</th>
              <th>Item Name</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item._id}>
                <td>{item._id}</td>
                <td>{item.jewelleryName}</td>
                <td>
                  <button onClick={() => handleGetInfo(item._id)}>GET INFO</button>
                  <button onClick={() => handleDelete(item._id)}>DELETE</button>
                  <button onClick={() => handleUpdate(item)}>UPDATE</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* C) Selected Item Details (when “GET INFO” is clicked)           */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {selectedItem && (
        <div className="item-details">
          <h3>Item Details</h3>
          <p><strong>_id:</strong> {selectedItem._id}</p>
          <p><strong>Jewellery Name:</strong> {selectedItem.jewelleryName}</p>
          <p><strong>Metal Type:</strong> {selectedItem.metalType}</p>
          <p><strong>Subtype:</strong> {selectedItem.subtype}</p>
          <p><strong>Karat / HUID:</strong> {selectedItem.karatOrHUID}</p>
          <p><strong>Gross Weight:</strong> {selectedItem.grossWeight}</p>
          <p><strong>Net Weight:</strong> {selectedItem.netWeight}</p>
          <p><strong>Source Type:</strong> {selectedItem.sourceType}</p>
          <p><strong>Labour Charge:</strong> {selectedItem.labourCharge}</p>
          <p><strong>Created At:</strong> {new Date(selectedItem.createdAt).toLocaleString()}</p>
          <p><strong>__v:</strong> {selectedItem.__v}</p>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* D) CREATE MODAL (appears when showCreateModal = true)            */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Create New Item</h3>

            <label>Jewellery Name:</label>
            <input
              type="text"
              name="jewelleryName"
              value={formData.jewelleryName}
              onChange={handleInputChange}
            />

            <label>Metal Type (gold / silver):</label>
            <input
              type="text"
              name="metalType"
              value={formData.metalType}
              onChange={handleInputChange}
            />

            <label>Subtype:</label>
            <input
              type="text"
              name="subtype"
              value={formData.subtype}
              onChange={handleInputChange}
            />

            <label>Karat / HUID:</label>
            <input
              type="text"
              name="karatOrHUID"
              value={formData.karatOrHUID}
              onChange={handleInputChange}
            />

            <label>Gross Weight:</label>
            <input
              type="number"
              name="grossWeight"
              step="0.01"
              value={formData.grossWeight}
              onChange={handleInputChange}
            />

            <label>Net Weight:</label>
            <input
              type="number"
              name="netWeight"
              step="0.01"
              value={formData.netWeight}
              onChange={handleInputChange}
            />

            <label>Source Type (manual / karagir):</label>
            <input
              type="text"
              name="sourceType"
              value={formData.sourceType}
              onChange={handleInputChange}
            />

            <label>Labour Charge:</label>
            <input
              type="number"
              name="labourCharge"
              step="0.01"
              value={formData.labourCharge}
              onChange={handleInputChange}
            />

            <div className="modal-buttons">
              <button onClick={handleCreateSubmit}>Create</button>
              <button onClick={handleCreateModalClose}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* E) UPDATE MODAL (appears when showModal = true)                   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Update Item ID: {updateId}</h3>

            <label>Jewellery Name:</label>
            <input
              type="text"
              name="jewelleryName"
              value={formData.jewelleryName}
              onChange={handleInputChange}
            />

            <label>Metal Type (gold / silver):</label>
            <input
              type="text"
              name="metalType"
              value={formData.metalType}
              onChange={handleInputChange}
            />

            <label>Subtype:</label>
            <input
              type="text"
              name="subtype"
              value={formData.subtype}
              onChange={handleInputChange}
            />

            <label>Karat / HUID:</label>
            <input
              type="text"
              name="karatOrHUID"
              value={formData.karatOrHUID}
              onChange={handleInputChange}
            />

            <label>Gross Weight:</label>
            <input
              type="number"
              name="grossWeight"
              step="0.01"
              value={formData.grossWeight}
              onChange={handleInputChange}
            />

            <label>Net Weight:</label>
            <input
              type="number"
              name="netWeight"
              step="0.01"
              value={formData.netWeight}
              onChange={handleInputChange}
            />

            <label>Source Type (manual / karagir):</label>
            <input
              type="text"
              name="sourceType"
              value={formData.sourceType}
              onChange={handleInputChange}
            />

            <label>Labour Charge:</label>
            <input
              type="number"
              name="labourCharge"
              step="0.01"
              value={formData.labourCharge}
              onChange={handleInputChange}
            />

            <div className="modal-buttons">
              <button onClick={handleUpdateSubmit}>Submit</button>
              <button onClick={handleModalClose}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ItemsManager;
