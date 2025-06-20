import React, { useState } from 'react';
import './KaragirForm.css';

function KaragirForm() {
    // Helper function to get authentication headers from local storage
    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    };

    // Initial state for Karagir-Out form fields
    const emptyOutForm = {
        karagirName: '',
        metalType: '',
        remarks: '',
        gramsGiven: '',
        purityGiven: ''
    };

    // Initial state for Karagir-In form fields
    const emptyInForm = {
        karagirName: '',
        metalType: '',
        subtype: '',
        jewelleryName: '',
        huidNo: '',
        karatCarat: '',
        grossWeight: '',
        netWeight: '',
        purityReceived: '',
        labourCharge: '',
        balance: ''
    };

    // State variables for form data and UI management
    const [karagirOutFormData, setKaragirOutFormData] = useState({ ...emptyOutForm });
    const [karagirInFormData, setKaragirInFormData] = useState({ ...emptyInForm });
    const [currentInMetalType, setCurrentInMetalType] = useState('');
    const [karagirEntries, setKaragirEntries] = useState([]);
    const [selectedKaragirEntry, setSelectedKaragirEntry] = useState(null);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [updateId, setUpdateId] = useState(null);
    const [isUpdateInEntry, setIsUpdateInEntry] = useState(false);
    const [activeCreateForm, setActiveCreateForm] = useState('out');
    const [isLoading, setIsLoading] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: '' });

    // Subtype options based on metal type
    const subtypeOptions = {
        gold: ["regular gold jewellery", "stone embedded gold jewellery"],
        silver: ["regular silver jewellery", "stone embedded silver jewellery"],
        others: ["precious", "semi-precious"]
    };

    // Toast notification helper
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
    };

    // Helper function to reset Karagir-Out form
    const resetOutForm = () => {
        setKaragirOutFormData({ ...emptyOutForm });
    };

    // Helper function to reset Karagir-In form
    const resetInForm = () => {
        setKaragirInFormData({ ...emptyInForm });
        setCurrentInMetalType('');
    };

    // --- Karagir-Out Form Handlers ---
    const handleOutInputChange = (e) => {
        const { name, value } = e.target;
        setKaragirOutFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCreateOutEntry = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const payload = {
                ...karagirOutFormData,
                entryType: 'out',
                gramsGiven: parseFloat(karagirOutFormData.gramsGiven),
            };

            const res = await fetch('/api/karagirleisures', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) {
                const errorMessage = data.message || (data.errors && data.errors.map(err => err.message).join(', ')) || 'Failed to create Karagir-Out entry.';
                throw new Error(errorMessage);
            }
            
            showToast('Karagir-Out entry created successfully!');
            setKaragirEntries(prev => [data, ...prev]);
            resetOutForm();
        } catch (error) {
            console.error('Error creating Karagir-Out entry:', error);
            showToast(`Error: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // --- Karagir-In Form Handlers ---
    const handleInInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'metalType') {
            setCurrentInMetalType(value);
            setKaragirInFormData(prev => ({
                ...prev,
                [name]: value,
                subtype: '',
                huidNo: '',
                karatCarat: ''
            }));
        } else {
            setKaragirInFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleCreateInEntry = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const pendingOutCheckRes = await fetch(`/api/karagirleisures/pending-out?karagirName=${encodeURIComponent(karagirInFormData.karagirName)}&metalType=${encodeURIComponent(karagirInFormData.metalType)}`, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            const pendingOutData = await pendingOutCheckRes.json();

            if (!pendingOutCheckRes.ok) {
                throw new Error(pendingOutData.message || 'Failed to check pending out entries.');
            }

            if (pendingOutData.hasPending) {
                const confirmProceed = window.confirm(
                    `WARNING: Karagir "${karagirInFormData.karagirName}" has ${pendingOutData.count} pending OUT entries for ${karagirInFormData.metalType}. Do you wish to continue and mark one as completed?`
                );
                if (!confirmProceed) {
                    showToast('Karagir-In entry creation cancelled by user.', 'error');
                    return;
                }
            }

            const payload = {
                ...karagirInFormData,
                entryType: 'in',
                grossWeight: parseFloat(karagirInFormData.grossWeight),
                netWeight: parseFloat(karagirInFormData.netWeight),
                labourCharge: parseFloat(karagirInFormData.labourCharge),
                balance: String(karagirInFormData.balance || "0")
            };

            if (karagirInFormData.metalType !== 'gold') {
                delete payload.huidNo;
            } else {
                delete payload.karatCarat;
            }

            const res = await fetch('/api/karagirleisures', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) {
                const errorMessage = data.message || (data.errors && data.errors.map(err => err.message).join(', ')) || 'Failed to create Karagir-In entry.';
                throw new Error(errorMessage);
            }
            
            showToast('Karagir-In entry created and Item added to inventory successfully!');
            setKaragirEntries(prev => [data, ...prev]);
            resetInForm();
        } catch (error) {
            console.error('Error creating Karagir-In entry:', error);
            showToast(`Error: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // --- General Karagir Management Actions ---
    const handleGetAllKaragir = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/karagirleisures', {
                method: 'GET',
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Failed to fetch all Karagir entries.');
            }
            setKaragirEntries(data);
            setSelectedKaragirEntry(null);
        } catch (error) {
            console.error('Error fetching all Karagir entries:', error);
            showToast(`Error: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGetKaragirById = async () => {
        const id = prompt('Enter Karagir Entry _id:');
        if (!id) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/karagirleisures/${id}`, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Karagir entry not found.');
            }
            setKaragirEntries([data]);
            setSelectedKaragirEntry(data);
        } catch (error) {
            console.error('Error fetching Karagir entry by ID:', error);
            showToast(`Error: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteAllKaragir = async () => {
        const confirmed = window.confirm('Are you sure you want to DELETE ALL Karagir entries and their linked items? This action cannot be undone.');
        if (!confirmed) return;
        setIsLoading(true);
        try {
            const res = await fetch('/api/karagirleisures', {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Failed to delete all Karagir entries.');
            }
            showToast(data.message);
            setKaragirEntries([]);
            setSelectedKaragirEntry(null);
        } catch (error) {
            console.error('Error deleting all Karagir entries:', error);
            showToast(`Error: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteKaragirById = async (idToDelete) => {
        const id = idToDelete || prompt('Enter Karagir Entry _id to delete:');
        if (!id) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/karagirleisures/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Failed to delete Karagir entry.');
            }
            showToast(data.message);
            setKaragirEntries(prev => prev.filter(entry => entry._id !== id));
            if (selectedKaragirEntry?._id === id) {
                setSelectedKaragirEntry(null);
            }
        } catch (error) {
            console.error('Error deleting Karagir entry by ID:', error);
            showToast(`Error: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenUpdateModal = (entry) => {
        setUpdateId(entry._id);
        setIsUpdateInEntry(entry.entryType === 'in');

        if (entry.entryType === 'in') {
            setCurrentInMetalType(entry.metalType);
            setKaragirInFormData({
                karagirName: entry.karagirName || '',
                metalType: entry.metalType || '',
                subtype: entry.subtype || '',
                jewelleryName: entry.jewelleryName || '',
                huidNo: entry.huidNo || '',
                karatCarat: entry.karatCarat || '',
                grossWeight: entry.grossWeight ?? '',
                netWeight: entry.netWeight ?? '',
                purityReceived: entry.purityReceived || '',
                labourCharge: entry.labourCharge ?? '',
                balance: entry.balance ?? ''
            });
        } else {
            setKaragirOutFormData({
                karagirName: entry.karagirName || '',
                metalType: entry.metalType || '',
                remarks: entry.remarks || '',
                gramsGiven: entry.gramsGiven ?? '',
                purityGiven: entry.purityGiven || ''
            });
        }
        setShowUpdateModal(true);
    };

    const handleUpdateSubmit = async (e) => {
        e.preventDefault();
        if (!updateId) return;
        setIsLoading(true);

        try {
            let payload = {};
            if (isUpdateInEntry) {
                payload = {
                    ...karagirInFormData,
                    entryType: 'in',
                    grossWeight: parseFloat(karagirInFormData.grossWeight),
                    netWeight: parseFloat(karagirInFormData.netWeight),
                    labourCharge: parseFloat(karagirInFormData.labourCharge),
                    balance: String(karagirInFormData.balance || "0")
                };
                if (karagirInFormData.metalType !== 'gold') {
                    delete payload.huidNo;
                } else {
                    delete payload.karatCarat;
                }
            } else {
                const checkInEntryRes = await fetch(`/api/karagirleisures?completesOutEntry=${updateId}`, {
                    method: 'GET',
                    headers: getAuthHeaders()
                });
                const linkedInEntries = await checkInEntryRes.json();

                if (!checkInEntryRes.ok) {
                    throw new Error(linkedInEntries.message || 'Failed to check for linked IN entries.');
                }

                if (linkedInEntries && linkedInEntries.length > 0) {
                    const linkedInEntry = linkedInEntries[0];
                    const confirmUncomplete = window.confirm(
                        `This Karagir-Out entry is currently marked as completed by Karagir-In entry ID: ${linkedInEntry._id}. ` +
                        `Updating this OUT entry will un-complete it and DELETE the linked IN entry. ` +
                        `Do you wish to proceed?`
                    );

                    if (!confirmUncomplete) {
                        showToast('Karagir-Out update cancelled by user.', 'error');
                        setShowUpdateModal(false);
                        setUpdateId(null);
                        resetOutForm();
                        return;
                    }

                    const deleteInRes = await fetch(`/api/karagirleisures/${linkedInEntry._id}`, {
                        method: 'DELETE',
                        headers: getAuthHeaders()
                    });
                    if (!deleteInRes.ok) {
                        const deleteData = await deleteInRes.json();
                        throw new Error(deleteData.message || `Failed to delete linked Karagir-In entry ${linkedInEntry._id}.`);
                    }
                    showToast(`Linked Karagir-In entry ${linkedInEntry._id} deleted successfully.`);
                    setKaragirEntries(prev => prev.filter(entry => entry._id !== linkedInEntry._id));
                }

                payload = {
                    ...karagirOutFormData,
                    entryType: 'out',
                    gramsGiven: parseFloat(karagirOutFormData.gramsGiven),
                    status: 'pending'
                };
            }

            const res = await fetch(`/api/karagirleisures/${updateId}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) {
                const errorMessage = data.message || (data.errors && data.errors.map(err => err.message).join(', ')) || 'Failed to update Karagir entry.';
                throw new Error(errorMessage);
            }
            
            showToast('Karagir entry updated successfully!');
            setKaragirEntries(prev => prev.map(entry => entry._id === data._id ? data : entry));
            if (selectedKaragirEntry?._id === data._id) {
                setSelectedKaragirEntry(data);
            }
            setShowUpdateModal(false);
            setUpdateId(null);
            resetOutForm();
            resetInForm();
        } catch (error) {
            console.error('Error updating Karagir entry:', error);
            showToast(`Error: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloseUpdateModal = () => {
        setShowUpdateModal(false);
        setUpdateId(null);
        setIsUpdateInEntry(false);
        resetOutForm();
        resetInForm();
    };

    return (
        <div className="karagir-manager">
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

            <h2>Karagir Management</h2>

            {/* Action Buttons */}
            <div className="karagir-actions-buttons">
                <button onClick={handleGetAllKaragir}>GET ALL KARAGIR ENTRIES</button>
                <button onClick={handleGetKaragirById}>GET KARAGIR ENTRY BY ID</button>
                <button onClick={handleDeleteAllKaragir}>DELETE ALL KARAGIR ENTRIES</button>
                <button onClick={() => handleDeleteKaragirById()}>DELETE KARAGIR ENTRY BY ID</button>
            </div>

            <hr className="divider" />

            {/* Form Selection Buttons */}
            <div className="form-type-selection">
                <button
                    className={activeCreateForm === 'out' ? 'active-form-btn' : ''}
                    onClick={() => { setActiveCreateForm('out'); resetOutForm(); }}
                >
                    Create Karagir-Out Entry
                </button>
                <button
                    className={activeCreateForm === 'in' ? 'active-form-btn' : ''}
                    onClick={() => { setActiveCreateForm('in'); resetInForm(); }}
                >
                    Create Karagir-In Entry
                </button>
            </div>

            {/* Consolidated Form Section */}
            <div className="form-section">
                {activeCreateForm === 'out' && (
                    <form onSubmit={handleCreateOutEntry} className="karagir-form">
                        <h3>Create Karagir-Out Entry</h3>
                        <div className="form-columns-container">
                            <div className="form-column">
                                <div className="form-group">
                                    <label>Karagir Name:</label>
                                    <input type="text" name="karagirName" value={karagirOutFormData.karagirName} onChange={handleOutInputChange} required />
                                </div>
                                <div className="form-group">
                                    <label>Metal Type:</label>
                                    <select name="metalType" value={karagirOutFormData.metalType} onChange={handleOutInputChange} required>
                                        <option value="">Select Metal Type</option>
                                        <option value="gold">Gold</option>
                                        <option value="silver">Silver</option>
                                        <option value="others">Others</option>
                                    </select>
                                </div>
                            </div>

                            <div className="vertical-divider"></div>

                            <div className="form-column">
                                <div className="form-group">
                                    <label>Grams Given:</label>
                                    <input type="number" name="gramsGiven" step="0.01" value={karagirOutFormData.gramsGiven} onChange={handleOutInputChange} required />
                                </div>
                                <div className="form-group">
                                    <label>Purity Given (e.g., 24k, 999):</label>
                                    <input type="text" name="purityGiven" value={karagirOutFormData.purityGiven} onChange={handleOutInputChange} required />
                                </div>
                            </div>
                        </div>
                        <div className="form-group full-width">
                            <label>Remarks (Optional):</label>
                            <textarea name="remarks" value={karagirOutFormData.remarks} onChange={handleOutInputChange} rows="3"></textarea>
                        </div>
                        <button type="submit" className="submit-btn">Create Karagir-Out</button>
                    </form>
                )}

                {activeCreateForm === 'in' && (
                    <form onSubmit={handleCreateInEntry} className="karagir-form">
                        <h3>Create Karagir-In Entry (Return from Karagir)</h3>
                        <div className="form-columns-container">
                            <div className="form-column">
                                <div className="form-group">
                                    <label>Karagir Name:</label>
                                    <input type="text" name="karagirName" value={karagirInFormData.karagirName} onChange={handleInInputChange} required />
                                </div>
                                <div className="form-group">
                                    <label>Metal Type:</label>
                                    <select name="metalType" value={karagirInFormData.metalType} onChange={handleInInputChange} required>
                                        <option value="">Select Metal Type</option>
                                        <option value="gold">Gold</option>
                                        <option value="silver">Silver</option>
                                        <option value="others">Others</option>
                                    </select>
                                </div>
                                {currentInMetalType && (
                                    <div className="form-group">
                                        <label>Subtype:</label>
                                        <select name="subtype" value={karagirInFormData.subtype} onChange={handleInInputChange} required>
                                            <option value="">Select Subtype</option>
                                            {subtypeOptions[currentInMetalType]?.map(option => (
                                                <option key={option} value={option}>{option}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div className="form-group">
                                    <label>Jewellery Name:</label>
                                    <input type="text" name="jewelleryName" value={karagirInFormData.jewelleryName} onChange={handleInInputChange} required />
                                </div>
                            </div>

                            <div className="vertical-divider"></div>

                            <div className="form-column">
                                {currentInMetalType === 'gold' && (
                                    <div className="form-group">
                                        <label>HUID No (6 alphanumeric characters, unique):</label>
                                        <input
                                            type="text"
                                            name="huidNo"
                                            value={karagirInFormData.huidNo}
                                            onChange={handleInInputChange}
                                            pattern="[A-Za-z0-9]{6}"
                                            title="Enter exactly 6 alphanumeric characters (case-sensitive)"
                                            required={currentInMetalType === 'gold'}
                                        />
                                    </div>
                                )}
                                {(currentInMetalType === 'silver' || currentInMetalType === 'others') && (
                                    <div className="form-group">
                                        <label>Karat/Carat:</label>
                                        <input
                                            type="text"
                                            name="karatCarat"
                                            value={karagirInFormData.karatCarat}
                                            onChange={handleInInputChange}
                                            required={currentInMetalType === 'silver' || currentInMetalType === 'others'}
                                        />
                                    </div>
                                )}
                                <div className="form-group">
                                    <label>Gross Weight:</label>
                                    <input type="number" name="grossWeight" step="0.01" value={karagirInFormData.grossWeight} onChange={handleInInputChange} required />
                                </div>
                                <div className="form-group">
                                    <label>Net Weight:</label>
                                    <input type="number" name="netWeight" step="0.01" value={karagirInFormData.netWeight} onChange={handleInInputChange} required />
                                </div>
                            </div>
                        </div>

                        <div className="form-bottom-section">
                            <div className="form-group">
                                <label>Purity Received (e.g., 22k, 916):</label>
                                <input type="text" name="purityReceived" value={karagirInFormData.purityReceived} onChange={handleInInputChange} required />
                            </div>
                            <div className="form-group">
                                <label>Labour Charge:</label>
                                <input type="number" name="labourCharge" step="0.01" value={karagirInFormData.labourCharge} onChange={handleInInputChange} required />
                            </div>
                            <div className="form-group">
                                <label>Balance:</label>
                                <input type="text" name="balance" value={karagirInFormData.balance} onChange={handleInInputChange} />
                            </div>
                            <div className="form-group full-width">
                                <label>Remarks (Optional):</label>
                                <textarea name="remarks" value={karagirInFormData.remarks} onChange={handleInInputChange} rows="3"></textarea>
                            </div>
                        </div>
                        <button type="submit" className="submit-btn">Create Karagir-In & Add Item</button>
                    </form>
                )}
            </div>

            <hr className="divider" />

            {/* Karagir Entries Table Display */}
            {karagirEntries.length > 0 && (
                <div className="karagir-entries-table">
                    <h3>All Karagir Entries</h3>
                    <table className="karagir-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Type</th>
                                <th>Name</th>
                                <th>Metal</th>
                                <th>Status</th>
                                <th>Grams/Weight</th>
                                <th>Purity Given</th>
                                <th>Ornament Name</th>
                                <th>Purity Received</th>
                                <th>Subtype</th>
                                <th>HUID/Karat</th>
                                <th>Created At</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {karagirEntries.map(entry => (
                                <tr key={entry._id}>
                                    <td>{entry._id}</td>
                                    <td>{entry.entryType}</td>
                                    <td>{entry.karagirName}</td>
                                    <td>{entry.metalType}</td>
                                    <td>{entry.status || 'N/A'}</td>
                                    <td>
                                        {entry.entryType === 'out' ? `${entry.gramsGiven}g` : `${entry.grossWeight}g (Gross), ${entry.netWeight}g (Net)`}
                                    </td>
                                    <td>{entry.entryType === 'out' ? (entry.purityGiven || 'N/A') : 'NA'}</td>
                                    <td>{entry.entryType === 'in' ? (entry.jewelleryName || 'N/A') : 'NA'}</td>
                                    <td>{entry.entryType === 'in' ? (entry.purityReceived || 'N/A') : 'NA'}</td>
                                    <td>{entry.entryType === 'in' ? (entry.subtype || 'N/A') : 'NA'}</td>
                                    <td>
                                        {entry.entryType === 'in'
                                            ? (entry.metalType === 'gold' ? (entry.huidNo || 'N/A') : (entry.karatCarat || 'N/A'))
                                            : 'NA'
                                        }
                                    </td>
                                    <td>{new Date(entry.createdAt).toLocaleString()}</td>
                                    <td>
                                        <button onClick={() => setSelectedKaragirEntry(entry)}>View Details</button>
                                        <button onClick={() => handleDeleteKaragirById(entry._id)}>Delete</button>
                                        <button onClick={() => handleOpenUpdateModal(entry)}>Update</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <hr className="divider" />

            {/* Selected Karagir Entry Details Display */}
            {selectedKaragirEntry && (
                <div className="item-details karagir-details">
                    <h3>Selected Karagir Entry Details</h3>
                    <p><strong>ID:</strong> {selectedKaragirEntry._id}</p>
                    <p><strong>Entry Type:</strong> {selectedKaragirEntry.entryType}</p>
                    <p><strong>Karagir Name:</strong> {selectedKaragirEntry.karagirName}</p>
                    <p><strong>Metal Type:</strong> {selectedKaragirEntry.metalType}</p>
                    {selectedKaragirEntry.entryType === 'out' && (
                        <>
                            <p><strong>Grams Given:</strong> {selectedKaragirEntry.gramsGiven}g</p>
                            <p><strong>Purity Given:</strong> {selectedKaragirEntry.purityGiven}</p>
                            <p><strong>Status:</strong> {selectedKaragirEntry.status}</p>
                        </>
                    )}
                    {selectedKaragirEntry.entryType === 'in' && (
                        <>
                            <p><strong>Jewellery Name:</strong> {selectedKaragirEntry.jewelleryName}</p>
                            <p><strong>Subtype:</strong> {selectedKaragirEntry.subtype}</p>
                            {selectedKaragirEntry.metalType === 'gold' ? (
                                <p><strong>HUID No:</strong> {selectedKaragirEntry.huidNo}</p>
                            ) : (
                                <p><strong>Karat/Carat:</strong> {selectedKaragirEntry.karatCarat}</p>
                            )}
                            <p><strong>Gross Weight:</strong> {selectedKaragirEntry.grossWeight}g</p>
                            <p><strong>Net Weight:</strong> {selectedKaragirEntry.netWeight}g</p>
                            <p><strong>Purity Received:</strong> {selectedKaragirEntry.purityReceived}</p>
                            <p><strong>Labour Charge:</strong> {selectedKaragirEntry.labourCharge}</p>
                            <p><strong>Balance:</strong> {selectedKaragirEntry.balance}</p>
                            <p><strong>Linked Item ID:</strong> {selectedKaragirEntry.linkedItemId || 'N/A'}</p>
                            <p><strong>Completes Out Entry:</strong> {selectedKaragirEntry.completesOutEntry || 'N/A'}</p>
                        </>
                    )}
                    <p><strong>Remarks:</strong> {selectedKaragirEntry.remarks || 'N/A'}</p>
                    <p><strong>Created At:</strong> {new Date(selectedKaragirEntry.createdAt).toLocaleString()}</p>
                    <button onClick={() => setSelectedKaragirEntry(null)}>Hide Details</button>
                </div>
            )}

            {/* Update Modal */}
            {showUpdateModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>Update Karagir Entry: {updateId}</h3>
                        <div className="modal-content">
                            {isUpdateInEntry ? (
                                <form onSubmit={handleUpdateSubmit}>
                                    <div className="form-columns-container">
                                        <div className="form-column">
                                            <div className="form-group">
                                                <label>Karagir Name:</label>
                                                <input type="text" name="karagirName" value={karagirInFormData.karagirName} onChange={handleInInputChange} required />
                                            </div>
                                            <div className="form-group">
                                                <label>Metal Type:</label>
                                                <select name="metalType" value={karagirInFormData.metalType} onChange={handleInInputChange} required>
                                                    <option value="">Select Metal Type</option>
                                                    <option value="gold">Gold</option>
                                                    <option value="silver">Silver</option>
                                                    <option value="others">Others</option>
                                                </select>
                                            </div>
                                            {currentInMetalType && (
                                                <div className="form-group">
                                                    <label>Subtype:</label>
                                                    <select name="subtype" value={karagirInFormData.subtype} onChange={handleInInputChange} required>
                                                        <option value="">Select Subtype</option>
                                                        {subtypeOptions[currentInMetalType]?.map(option => (
                                                            <option key={option} value={option}>{option}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                            <div className="form-group">
                                                <label>Jewellery Name:</label>
                                                <input type="text" name="jewelleryName" value={karagirInFormData.jewelleryName} onChange={handleInInputChange} required />
                                            </div>
                                        </div>

                                        <div className="vertical-divider"></div>

                                        <div className="form-column">
                                            {currentInMetalType === 'gold' && (
                                                <div className="form-group">
                                                    <label>HUID No (6 alphanumeric characters, unique):</label>
                                                    <input
                                                        type="text"
                                                        name="huidNo"
                                                        value={karagirInFormData.huidNo}
                                                        onChange={handleInInputChange}
                                                        pattern="[A-Za-z0-9]{6}"
                                                        title="Enter exactly 6 alphanumeric characters (case-sensitive)"
                                                        required={currentInMetalType === 'gold'}
                                                    />
                                                </div>
                                            )}
                                            {(currentInMetalType === 'silver' || currentInMetalType === 'others') && (
                                                <div className="form-group">
                                                    <label>Karat/Carat:</label>
                                                    <input
                                                        type="text"
                                                        name="karatCarat"
                                                        value={karagirInFormData.karatCarat}
                                                        onChange={handleInInputChange}
                                                        required={currentInMetalType === 'silver' || currentInMetalType === 'others'}
                                                    />
                                                </div>
                                            )}
                                            <div className="form-group">
                                                <label>Gross Weight:</label>
                                                <input type="number" name="grossWeight" step="0.01" value={karagirInFormData.grossWeight} onChange={handleInInputChange} required />
                                            </div>
                                            <div className="form-group">
                                                <label>Net Weight:</label>
                                                <input type="number" name="netWeight" step="0.01" value={karagirInFormData.netWeight} onChange={handleInInputChange} required />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-bottom-section">
                                        <div className="form-group">
                                            <label>Purity Received (e.g., 22k, 916):</label>
                                            <input type="text" name="purityReceived" value={karagirInFormData.purityReceived} onChange={handleInInputChange} required />
                                        </div>
                                        <div className="form-group">
                                            <label>Labour Charge:</label>
                                            <input type="number" name="labourCharge" step="0.01" value={karagirInFormData.labourCharge} onChange={handleInInputChange} required />
                                        </div>
                                        <div className="form-group">
                                            <label>Balance:</label>
                                            <input type="text" name="balance" value={karagirInFormData.balance} onChange={handleInInputChange} />
                                        </div>
                                        <div className="form-group">
                                            <label>Remarks (Optional):</label>
                                            <textarea name="remarks" value={karagirInFormData.remarks} onChange={handleInInputChange} rows="3"></textarea>
                                        </div>
                                    </div>
                                    <div className="modal-buttons">
                                        <button type="submit">Update Karagir-In</button>
                                        <button type="button" onClick={handleCloseUpdateModal}>Cancel</button>
                                    </div>
                                </form>
                            ) : (
                                <form onSubmit={handleUpdateSubmit}>
                                    <div className="form-columns-container">
                                        <div className="form-column">
                                            <div className="form-group">
                                                <label>Karagir Name:</label>
                                                <input type="text" name="karagirName" value={karagirOutFormData.karagirName} onChange={handleOutInputChange} required />
                                            </div>
                                            <div className="form-group">
                                                <label>Metal Type:</label>
                                                <select name="metalType" value={karagirOutFormData.metalType} onChange={handleOutInputChange} required>
                                                    <option value="">Select Metal Type</option>
                                                    <option value="gold">Gold</option>
                                                    <option value="silver">Silver</option>
                                                    <option value="others">Others</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="vertical-divider"></div>

                                        <div className="form-column">
                                            <div className="form-group">
                                                <label>Grams Given:</label>
                                                <input type="number" name="gramsGiven" step="0.01" value={karagirOutFormData.gramsGiven} onChange={handleOutInputChange} required />
                                            </div>
                                            <div className="form-group">
                                                <label>Purity Given (e.g., 24k, 999):</label>
                                                <input type="text" name="purityGiven" value={karagirOutFormData.purityGiven} onChange={handleOutInputChange} required />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="form-group full-width">
                                        <label>Remarks (Optional):</label>
                                        <textarea name="remarks" value={karagirOutFormData.remarks} onChange={handleOutInputChange} rows="3"></textarea>
                                    </div>
                                    <div className="modal-buttons">
                                        <button type="submit">Update Karagir-Out</button>
                                        <button type="button" onClick={handleCloseUpdateModal}>Cancel</button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default KaragirForm;
