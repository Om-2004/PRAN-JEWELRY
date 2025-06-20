import React, { useState } from 'react';
import './ItemsManager.css';

function ItemsManager() {
    const [items, setItems] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [updateId, setUpdateId] = useState(null);
    const [metalType, setMetalType] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: '' });

    // Toast notification helper
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
    };

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
        balance: ''
    };
    const [formData, setFormData] = useState({ ...emptyForm });

    const subtypeOptions = {
        gold: ["regular gold jewellery", "stone embedded gold jewellery"],
        silver: ["regular silver jewellery", "stone embedded silver jewellery"],
        others: ["precious", "semi-precious"]
    };

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        };
    };

    // ──── EXISTING FUNCTIONALITY (UNCHANGED) ───────────────────────────────────────
    const handleCreateNew = () => {
        setFormData({ ...emptyForm });
        setShowCreateModal(true);
        setMetalType('');
    };

    const handleCreateSubmit = () => {
        const payload = {
            jewelleryName: formData.jewelleryName,
            metalType: formData.metalType,
            subtype: formData.subtype,
            ...(formData.metalType === 'gold' ? { huidNo: formData.huidNo } : { karatCarat: formData.karatCarat }),
            grossWeight: parseFloat(formData.grossWeight),
            netWeight: parseFloat(formData.netWeight),
            sourceType: formData.sourceType,
            labourCharge: parseFloat(formData.labourCharge),
            balance: (formData.balance) || "0"
        };

        setIsLoading(true);
        fetch('/api/items', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        })
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) {
                    const errorMessage = data.message ||
                        (data.errors && data.errors.map(e => e.message).join(', ')) ||
                        'Create failed';
                    throw new Error(errorMessage);
                }
                return data;
            })
            .then((newItem) => {
                setItems((prev) => [newItem, ...prev]);
                setShowCreateModal(false);
                showToast('Item created successfully!');
            })
            .catch((err) => {
                console.error('Error creating item:', err);
                showToast(`Could not create item: ${err.message}`, 'error');
            })
            .finally(() => setIsLoading(false));
    };

    const handleGetAll = () => {
        setIsLoading(true);
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
                showToast('Failed to fetch items. Please try again.', 'error');
            })
            .finally(() => setIsLoading(false));
    };

    const handleGetById = () => {
        const id = prompt('Enter Item _id:');
        if (!id) return;
        setIsLoading(true);
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
                setItems([data]);
                setSelectedItem(data);
            })
            .catch((err) => {
                console.error('Error fetching item:', err);
                showToast(`Could not fetch item: ${err.message}`, 'error');
            })
            .finally(() => setIsLoading(false));
    };

    const handleUpdateById = () => {
        const id = prompt('Enter Item _id to update:');
        if (!id) return;
        setIsLoading(true);
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
                setMetalType(data.metalType);
                setFormData({
                    jewelleryName: data.jewelleryName || '',
                    metalType: data.metalType || '',
                    subtype: data.subtype || '',
                    huidNo: data.huidNo || '',
                    karatCarat: data.karatCarat || '',
                    grossWeight: data.grossWeight ?? '',
                    netWeight: data.netWeight ?? '',
                    sourceType: data.sourceType || '',
                    labourCharge: data.labourCharge ?? '',
                    balance: data.balance ?? ''
                });
                setUpdateId(data._id);
                setShowModal(true);
            })
            .catch((err) => {
                console.error('Error fetching item for update:', err);
                showToast(`Could not load item for update: ${err.message}`, 'error');
            })
            .finally(() => setIsLoading(false));
    };

    const handleGetInfo = (id) => {
        setIsLoading(true);
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
                showToast(`Could not fetch item info: ${err.message}`, 'error');
            })
            .finally(() => setIsLoading(false));
    };

    const handleDelete = (id) => {
        if (!window.confirm('Permanently delete this item?')) return;
    
        setIsLoading(true);
        fetch(`/api/items/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        })
        .then(async (res) => {
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Delete failed');
            }
            setItems(prev => prev.filter(item => item._id !== id));
            if (selectedItem?._id === id) setSelectedItem(null);
            showToast('Item permanently deleted');
        })
        .catch(err => {
            console.error('Delete error:', err);
            showToast(`Delete failed: ${err.message}`, 'error');
        })
        .finally(() => setIsLoading(false));
    };

    const handleDeleteById = () => {
        const id = prompt('Enter Item _id to delete:');
        if (!id) return;
        handleDelete(id); // Reuse the same delete logic
    };


    const handleUpdate = (item) => {
        setMetalType(item.metalType);
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
            balance: item.balance ?? ''
        });
        setUpdateId(item._id);
        setShowModal(true);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        if (name === 'metalType') {
            setMetalType(value);
            setFormData(prev => ({
                ...prev,
                [name]: value,
                subtype: '',
                huidNo: '',
                karatCarat: ''
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleUpdateSubmit = () => {
        if (!updateId) return;

        if (formData.metalType === 'gold' && 
            (!formData.huidNo || !/^[A-Za-z0-9]{6}$/.test(formData.huidNo))) {
            showToast('HUID must be exactly 6 alphanumeric characters', 'error');
            return;
        }

        setIsLoading(true);

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
            balance: formData.balance || ""
        };

        fetch(`/api/items/${updateId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        })
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) {
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
                showToast('Item updated successfully!');
            })
            .catch((err) => {
                console.error('Update error:', err);
                showToast(`Update failed: ${err.message}`, 'error');
            })
            .finally(() => setIsLoading(false));
    };

    const handleModalClose = () => {
        setShowModal(false);
        setUpdateId(null);
    };

    const handleCreateModalClose = () => {
        setShowCreateModal(false);
        setFormData({ ...emptyForm });
        setMetalType('');
    };

    return (
        <div className="items-manager-container">
            {/* Loading Overlay */}
            {isLoading && (
                <div className="loading-overlay">
                    <div className="loading-spinner"></div>
                </div>
            )}

            {/* Toast Notification */}
            {toast.show && (
                <div className={`toast ${toast.type}`}>
                    {toast.message}
                </div>
            )}

            <h2>Items Management</h2>

            {/* Action Buttons */}
            <div className="items-action-buttons">
                <button onClick={handleCreateNew}>CREATE NEW ITEM</button>
                <button onClick={handleGetAll}>GET ALL ITEMS</button>
                <button onClick={handleGetById}>GET ITEM BY ID</button>
                <button onClick={handleDeleteById}>DELETE ITEM BY ID</button>
                <button onClick={handleUpdateById}>UPDATE ITEM BY ID</button>
            </div>

            {/* Items Table */}
            {items.length > 0 && (
                <div className="items-table-container">
                    <table className="items-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Metal</th>
                                <th>Subtype</th>
                                <th>Gross Weight</th>
                                <th>Net Weight</th>
                                <th>Balance</th>
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
                                    <td>{item.grossWeight}g</td>
                                    <td>{item.netWeight}g</td>
                                    <td>{item.balance}</td>
                                    <td>
                                        <button onClick={() => handleGetInfo(item._id)}>Details</button>
                                        <button onClick={() => handleDelete(item._id)}>Delete</button>
                                        <button onClick={() => handleUpdate(item)}>Update</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Selected Item Details */}
            {selectedItem && (
                <div className="item-details-card">
                    <h3>Item Details</h3>
                    <p><strong>ID:</strong> {selectedItem._id}</p>
                    <p><strong>Name:</strong> {selectedItem.jewelleryName}</p>
                    <p><strong>Metal:</strong> {selectedItem.metalType}</p>
                    <p><strong>Subtype:</strong> {selectedItem.subtype}</p>
                                    {selectedItem.metalType === 'gold' ? (
                                        <p><strong>HUID No:</strong> {selectedItem.huidNo}</p>
                                    ) : (
                                        <p><strong>Karat/Carat:</strong> {selectedItem.karatCarat}</p>
                                    )}
                                    <p><strong>Gross Weight:</strong> {selectedItem.grossWeight}g</p>
                                    <p><strong>Net Weight:</strong> {selectedItem.netWeight}g</p>
                                    <p><strong>Source:</strong> {selectedItem.sourceType}</p>
                                    <p><strong>Labour Charge:</strong> {selectedItem.labourCharge}</p>
                                    <p><strong>Balance:</strong> {selectedItem.balance}</p>
                                    <p><strong>Created:</strong> {new Date(selectedItem.createdAt).toLocaleString()}</p>
                                    <button onClick={() => setSelectedItem(null)}>Close Details</button>
                                </div>
                            )}

                            {/* Create Modal */}
                            {showCreateModal && (
                                <div className="items-modal-overlay">
                                    <div className="items-modal">
                                        <h3>Create New Item</h3>
                                        
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

                                        {metalType && (
                                            <>
                                                <label>Subtype:</label>
                                                <select
                                                    name="subtype"
                                                    value={formData.subtype}
                                                    onChange={handleInputChange}
                                                    required
                                                >
                                                    <option value="">Select Subtype</option>
                                                    {subtypeOptions[metalType]?.map(option => (
                                                        <option key={option} value={option}>{option}</option>
                                                    ))}
                                                </select>
                                            </>
                                        )}

                                        {metalType === 'gold' && (
                                            <>
                                                <label>HUID No:</label>
                                                <input
                                                    type="text"
                                                    name="huidNo"
                                                    value={formData.huidNo}
                                                    onChange={handleInputChange}
                                                    pattern="[A-Za-z0-9]{6}"
                                                    title="Exactly 6 alphanumeric characters"
                                                    required
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
                                                    required
                                                />
                                            </>
                                        )}

                                        <div className="form-columns-container">
                                            <div className="form-column">
                                                <label>Gross Weight (g):</label>
                                                <input
                                                    type="number"
                                                    name="grossWeight"
                                                    step="0.01"
                                                    value={formData.grossWeight}
                                                    onChange={handleInputChange}
                                                />
                                            </div>
                                            <div className="form-column">
                                                <label>Net Weight (g):</label>
                                                <input
                                                    type="number"
                                                    name="netWeight"
                                                    step="0.01"
                                                    value={formData.netWeight}
                                                    onChange={handleInputChange}
                                                />
                                            </div>
                                        </div>

                                        <label>Source Type:</label>
                                        <select
                                            name="sourceType"
                                            value={formData.sourceType}
                                            onChange={handleInputChange}
                                            required
                                        >
                                            <option value="">Select Source</option>
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

                                        <label>Balance:</label>
                                        <input
                                            type="text"
                                            name="balance"
                                            value={formData.balance}
                                            onChange={handleInputChange}
                                        />

                                        <div className="items-modal-buttons">
                                            <button onClick={handleCreateSubmit}>Create</button>
                                            <button onClick={handleCreateModalClose}>Cancel</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Update Modal */}
                            {showModal && (
                                <div className="items-modal-overlay">
                                    <div className="items-modal">
                                        <h3>Update Item: {updateId}</h3>
                                        
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
                                                <label>HUID No:</label>
                                                <input
                                                    type="text"
                                                    name="huidNo"
                                                    value={formData.huidNo}
                                                    onChange={handleInputChange}
                                                    pattern="[A-Za-z0-9]{6}"
                                                    title="6 alphanumeric characters"
                                                    required
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
                                                    required
                                                />
                                            </>
                                        )}

                                        <div className="form-columns-container">
                                            <div className="form-column">
                                                <label>Gross Weight (g):</label>
                                                <input
                                                    type="number"
                                                    name="grossWeight"
                                                    step="0.01"
                                                    value={formData.grossWeight}
                                                    onChange={handleInputChange}
                                                />
                                            </div>
                                            <div className="form-column">
                                                <label>Net Weight (g):</label>
                                                <input
                                                    type="number"
                                                    name="netWeight"
                                                    step="0.01"
                                                    value={formData.netWeight}
                                                    onChange={handleInputChange}
                                                />
                                            </div>
                                        </div>

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

                                        <label>Balance:</label>
                                        <input
                                            type="text"
                                            name="balance"
                                            value={formData.balance}
                                            onChange={handleInputChange}
                                        />

                                        <div className="items-modal-buttons">
                                            <button onClick={handleUpdateSubmit}>Update</button>
                                            <button onClick={handleModalClose}>Cancel</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                }

export default ItemsManager;