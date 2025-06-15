// src/components/ItemsManager.js
import React, { useState } from 'react';
import './ItemsManager.css';

function ItemsManager() {
    const [items, setItems] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [showModal, setShowModal] = useState(false); // For Update modal
    const [showCreateModal, setShowCreateModal] = useState(false); // For Create modal
    const [updateId, setUpdateId] = useState(null);
    const [metalType, setMetalType] = useState(''); // State to control subtype and specific metal fields

    // For both Update and Create, we share a similar form structure.
    // We'll control which fields are shown based on create vs. update.
    const emptyForm = {
        jewelleryName: '',
        metalType: '',
        subtype: '',
        huidNo: '',
        karatCarat: '',
        grossWeight: '',
        netWeight: '',
        sourceType: '',
        labourCharge: '',
        balance: '' // <--- NEW: Added balance field to empty form
    };
    const [formData, setFormData] = useState({ ...emptyForm });

    // Subtype options based on metal type
    const subtypeOptions = {
        gold: ["regular gold jewellery", "stone embedded gold jewellery"],
        silver: ["regular silver jewellery", "stone embedded silver jewellery"],
        others: ["precious", "semi-precious"]
    };

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
        setFormData({ ...emptyForm }); // Reset form to empty values
        setShowCreateModal(true);
        setMetalType(''); // Ensure metalType is reset for new creation
    };

    const handleCreateSubmit = () => {
        // Build payload exactly as schema expects
        const payload = {
            jewelleryName: formData.jewelleryName,
            metalType: formData.metalType,
            subtype: formData.subtype,
            ...(formData.metalType === 'gold' ? { huidNo: formData.huidNo } : { karatCarat: formData.karatCarat }),
            grossWeight: parseFloat(formData.grossWeight),
            netWeight: parseFloat(formData.netWeight),
            sourceType: formData.sourceType,
            labourCharge: parseFloat(formData.labourCharge),
            balance: (formData.balance) || "0" // <--- NEW: Include balance, default to 0 if empty
        };

        fetch('/api/items', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        })
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) {
                    // Extract meaningful error message from backend
                    const errorMessage = data.message ||
                        (data.errors && data.errors.map(e => e.message).join(', ')) ||
                        'Create failed';
                    throw new Error(errorMessage);
                }
                return data;
            })
            .then((newItem) => {
                // Add the newly created item into our state list
                setItems((prev) => [newItem, ...prev]);
                setShowCreateModal(false);
                alert('Item created successfully!'); // Success feedback
            })
            .catch((err) => {
                console.error('Error creating item:', err);
                alert(`Could not create item: ${err.message}`);
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
            .catch((err) => {
                console.error('Error fetching items:', err);
                alert('Failed to fetch items. Please try again.');
            });
    };

    // ──────────────────────────────────────────────────────────────────────────────
    // 2) FETCH A SINGLE ITEM BY ID (prompt-based)
    // ──────────────────────────────────────────────────────────────────────────────
    const handleGetById = () => {
        const id = prompt('Enter Item _id:');
        if (!id) return;
        fetch(`/api/items/${id}`, {
            method: 'GET',
            headers: getAuthHeaders()
        })
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.message || 'Item not found or invalid ID');
                }
                return data;
            })
            .then((data) => {
                setItems([data]); // Show only the fetched item
                setSelectedItem(data);
            })
            .catch((err) => {
                console.error('Error fetching item:', err);
                alert(`Could not fetch item: ${err.message}`);
            });
    };

    // ──────────────────────────────────────────────────────────────────────────────
    // 3) DELETE A SINGLE ITEM BY ID (prompt-based)
    // ──────────────────────────────────────────────────────────────────────────────
    const handleDeleteById = () => {
        const id = prompt('Enter Item _id to delete:');
        if (!id) return;
        fetch(`/api/items/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        })
            .then(async (res) => {
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.message || 'Delete failed');
                }
                setItems((prev) => prev.filter((item) => item._id !== id));
                if (selectedItem && selectedItem._id === id) {
                    setSelectedItem(null);
                }
                alert('Item deleted successfully!'); // Success feedback
            })
            .catch((err) => {
                console.error('Error deleting item:', err);
                alert(`Could not delete item: ${err.message}`);
            });
    };

    // ──────────────────────────────────────────────────────────────────────────────
    // 4) FETCH SINGLE ITEM & OPEN MODAL TO UPDATE (prompt-based)
    // ──────────────────────────────────────────────────────────────────────────────
    const handleUpdateById = () => {
        const id = prompt('Enter Item _id to update:');
        if (!id) return;
        fetch(`/api/items/${id}`, {
            method: 'GET',
            headers: getAuthHeaders()
        })
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.message || 'Item not found');
                }
                return data;
            })
            .then((data) => {
                setMetalType(data.metalType); // Set metalType for conditional fields
                setFormData({
                    jewelleryName: data.jewelleryName || '',
                    metalType: data.metalType || '',
                    subtype: data.subtype || '',
                    huidNo: data.huidNo || '',
                    karatCarat: data.karatCarat || '',
                    grossWeight: data.grossWeight ?? '', // Use nullish coalescing for numbers
                    netWeight: data.netWeight ?? '',     // Use nullish coalescing for numbers
                    sourceType: data.sourceType || '',
                    labourCharge: data.labourCharge ?? '', // Use nullish coalescing for numbers
                    balance: data.balance ?? '' // <--- NEW: Populate balance when fetching for update
                });
                setUpdateId(data._id);
                setShowModal(true);
            })
            .catch((err) => {
                console.error('Error fetching item for update:', err);
                alert(`Could not load item for update: ${err.message}`);
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
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.message || 'Item not found');
                }
                return data;
            })
            .then((data) => {
                setSelectedItem(data);
            })
            .catch((err) => {
                console.error('Error fetching item info:', err);
                alert(`Could not fetch item info: ${err.message}`);
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
            .then(async (res) => {
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.message || 'Delete failed');
                }
                setItems((prev) => prev.filter((item) => item._id !== id));
                if (selectedItem && selectedItem._id === id) {
                    setSelectedItem(null);
                }
                alert('Item deleted successfully!'); // Success feedback
            })
            .catch((err) => {
                console.error('Error deleting item:', err);
                alert(`Could not delete item: ${err.message}`);
            });
    };

    // ──────────────────────────────────────────────────────────────────────────────
    // 7) ROW ACTION — OPEN UPDATE MODAL (prefill from item object)
    // ──────────────────────────────────────────────────────────────────────────────
    const handleUpdate = (item) => {
        setMetalType(item.metalType); // Set metalType for conditional fields
        setFormData({
            jewelleryName: item.jewelleryName || '',
            metalType: item.metalType || '',
            subtype: item.subtype || '',
            huidNo: item.huidNo || '',
            karatCarat: item.karatCarat || '',
            grossWeight: item.grossWeight ?? '',
            netWeight: item.netWeight ?? '',
            sourceType: item.sourceType || '',
            labourCharge: item.labourCharge ?? '',
            balance: item.balance ?? '' // <--- NEW: Populate balance from item object
        });
        setUpdateId(item._id);
        setShowModal(true);
    };

    // ──────────────────────────────────────────────────────────────────────────────
    // 8) HANDLE FORM INPUT CHANGES IN MODAL (both create & update)
    // ──────────────────────────────────────────────────────────────────────────────
    const handleInputChange = (e) => {
        const { name, value } = e.target;

        if (name === 'metalType') {
            setMetalType(value);
            // Reset subtype and metal-specific fields when metal type changes
            setFormData(prev => ({
                ...prev,
                [name]: value,
                subtype: '', // Reset subtype when metal type changes
                huidNo: '',
                karatCarat: ''
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    // ──────────────────────────────────────────────────────────────────────────────
    // 9) SUBMIT UPDATED ITEM (PUT /api/items/:id) when updating
    // ──────────────────────────────────────────────────────────────────────────────
    const handleUpdateSubmit = () => {
        if (!updateId) return;

        // Build payload with proper type conversions
        const payload = {
            jewelleryName: formData.jewelleryName,
            metalType: formData.metalType,
            subtype: formData.subtype,
            ...(formData.metalType === 'gold' ?
                { huidNo: formData.huidNo } :
                { karatCarat: formData.karatCarat }
            ),
            grossWeight: formData.grossWeight ? parseFloat(formData.grossWeight) : undefined,
            netWeight: formData.netWeight ? parseFloat(formData.netWeight) : undefined,
            sourceType: formData.sourceType,
            labourCharge: formData.labourCharge ? parseFloat(formData.labourCharge) : undefined,
            balance: formData.balance || ""  // Always treat as string, empty string if undefined // <--- NEW: Include balance in update payload
        };

        fetch(`/api/items/${updateId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        })
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) {
                    // Extract meaningful error message
                    const errorMessage = data.message ||
                        (data.errors && data.errors.map(e => e.message).join(', ')) ||
                        'Update failed';
                    throw new Error(errorMessage);
                }
                return data;
            })
            .then((updatedItem) => {
                setItems(prev => prev.map(itm =>
                    itm._id === updatedItem._id ? updatedItem : itm
                ));

                if (selectedItem?._id === updatedItem._id) {
                    setSelectedItem(updatedItem);
                }

                setShowModal(false);
                setUpdateId(null);
                alert('Item updated successfully!'); // Success feedback
            })
            .catch((err) => {
                console.error('Update error:', err);
                alert(`Update failed: ${err.message}`);
            });
    };

    const handleModalClose = () => {
        setShowModal(false);
        setUpdateId(null);
    };

    const handleCreateModalClose = () => {
        setShowCreateModal(false);
        setFormData({ ...emptyForm }); // Reset form on close
        setMetalType(''); // Reset metalType on close
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
            {/* B) Items Table (only if we have items in state)                 */}
            {/* ─────────────────────────────────────────────────────────────────── */}
            {items.length > 0 && (
                <table className="items-table">
                    <thead>
                        <tr>
                            <th>Item ID (_id)</th>
                            <th>Item Name</th>
                            <th>Metal Type</th>
                            <th>Subtype</th>
                            <th>Gross Weight</th>
                            <th>Net Weight</th>
                            <th>Item Balance</th> {/* <--- NEW: Balance column */}
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => (
                            <tr key={item._id}>
                                <td>{item._id}</td>
                                <td>{item.jewelleryName}</td>
                                <td>{item.metalType}</td>
                                <td>{item.subtype}</td>
                                <td>{item.grossWeight}</td>
                                <td>{item.netWeight}</td>
                                <td>{item.balance}</td> {/* <--- NEW: Display balance in table */}
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
            {/* C) Selected Item Details (when "GET INFO" is clicked)           */}
            {/* ─────────────────────────────────────────────────────────────────── */}
            {selectedItem && (
                <div className="item-details">
                    <h3>Item Details</h3>
                    <p><strong>_id:</strong> {selectedItem._id}</p>
                    <p><strong>Jewellery Name:</strong> {selectedItem.jewelleryName}</p>
                    <p><strong>Metal Type:</strong> {selectedItem.metalType}</p>
                    <p><strong>Subtype:</strong> {selectedItem.subtype}</p>
                    {selectedItem.metalType === 'gold' ? (
                        <p><strong>HUID No:</strong> {selectedItem.huidNo}</p>
                    ) : (
                        <p><strong>Karat/Carat:</strong> {selectedItem.karatCarat}</p>
                    )}
                    <p><strong>Gross Weight:</strong> {selectedItem.grossWeight}</p>
                    <p><strong>Net Weight:</strong> {selectedItem.netWeight}</p>
                    <p><strong>Source Type:</strong> {selectedItem.sourceType}</p>
                    <p><strong>Labour Charge:</strong> {selectedItem.labourCharge}</p>
                    <p><strong>Item Balance:</strong> {selectedItem.balance}</p> {/* <--- NEW: Display balance in details */}
                    <p><strong>Created At:</strong> {new Date(selectedItem.createdAt).toLocaleString()}</p>
                    <p><strong>__v:</strong> {selectedItem.__v}</p>
                </div>
            )}

            {/* ─────────────────────────────────────────────────────────────────── */}
            {/* D) CREATE MODAL (appears when showCreateModal = true)           */}
            {/* ─────────────────────────────────────────────────────────────────── */}
            {showCreateModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>Create New Item</h3>
                        {/* Form fields */}
                        <label>Jewellery Name:</label>
                        <input
                            type="text"
                            name="jewelleryName"
                            value={formData.jewelleryName}
                            onChange={handleInputChange}
                            required
                        />

                        <label>Metal Type:</label>
                        <select
                            name="metalType"
                            value={formData.metalType}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="">Select Metal Type</option>
                            <option value="gold">Gold</option>
                            <option value="silver">Silver</option>
                            <option value="others">Others</option>
                        </select>

                        <label>Subtype:</label>
                        <select
                            name="subtype"
                            value={formData.subtype}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="">Select Subtype</option>
                            {metalType && subtypeOptions[metalType]?.map(option => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>

                        {metalType === 'gold' && (
                            <>
                                <label>HUID No (6 alphanumeric characters):</label>
                                <input
                                    type="text"
                                    name="huidNo"
                                    value={formData.huidNo}
                                    onChange={handleInputChange}
                                    pattern="[A-Za-z0-9]{6}"
                                    title="Enter exactly 6 alphanumeric characters"
                                    required={metalType === 'gold'}
                                />
                            </>
                        )}

                        {(metalType === 'silver' || metalType === 'others') && (
                            <>
                                <label>Karat/Carat:</label>
                                <input
                                    type="text"
                                    name="karatCarat"
                                    value={formData.karatCarat}
                                    onChange={handleInputChange}
                                    required={metalType === 'silver' || metalType === 'others'}
                                />
                            </>
                        )}

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

                        <label>Source Type:</label>
                        <select
                            name="sourceType"
                            value={formData.sourceType}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="">Select Source Type</option>
                            <option value="manual">Manual</option>
                            <option value="karagir">Karagir</option>
                        </select>

                        <label>Labour Charge:</label>
                        <input
                            type="number"
                            name="labourCharge"
                            step="0.01"
                            value={formData.labourCharge}
                            onChange={handleInputChange}
                        />

                        {/* <--- NEW: Balance input field for Create modal */}
                        <label>Item Balance:</label>
                        <input
                            type="text"  // Changed from number to text
                            name="balance"
                            value={formData.balance}
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
            {/* E) UPDATE MODAL (appears when showModal = true)                 */}
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
                            required
                        />

                        <label>Metal Type:</label>
                        <select
                            name="metalType"
                            value={formData.metalType}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="gold">Gold</option>
                            <option value="silver">Silver</option>
                            <option value="others">Others</option>
                        </select>

                        <label>Subtype:</label>
                        <select
                            name="subtype"
                            value={formData.subtype}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="">Select Subtype</option>
                            {metalType && subtypeOptions[metalType]?.map(option => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>

                        {metalType === 'gold' && (
                            <>
                                <label>HUID No (6 alphanumeric characters):</label>
                                <input
                                    type="text"
                                    name="huidNo"
                                    value={formData.huidNo}
                                    onChange={handleInputChange}
                                    pattern="[A-Za-z0-9]{6}"
                                    title="Enter exactly 6 alphanumeric characters"
                                    required={metalType === 'gold'}
                                />
                            </>
                        )}

                        {(metalType === 'silver' || metalType === 'others') && (
                            <>
                                <label>Karat/Carat:</label>
                                <input
                                    type="text"
                                    name="karatCarat"
                                    value={formData.karatCarat}
                                    onChange={handleInputChange}
                                    required={metalType === 'silver' || metalType === 'others'}
                                />
                            </>
                        )}

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

                        <label>Source Type:</label>
                        <select
                            name="sourceType"
                            value={formData.sourceType}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="manual">Manual</option>
                            <option value="karagir">Karagir</option>
                        </select>

                        <label>Labour Charge:</label>
                        <input
                            type="number"
                            name="labourCharge"
                            step="0.01"
                            value={formData.labourCharge}
                            onChange={handleInputChange}
                        />

                        {/* <--- NEW: Balance input field for Update modal */}
                        <label>Balance:</label>
                        <input
                            type="text"
                            name="balance"
                            step="0.01"
                            value={formData.balance}
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