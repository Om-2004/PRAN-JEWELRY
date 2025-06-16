import React, { useState } from 'react';
import './KaragirForm.css'; // Import the CSS file for styling

function KaragirForm() {
    // Helper function to get authentication headers from local storage
    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // Assuming JWT token is stored as 'token'
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
    // State to manage dynamic dropdown options for Karagir-In metal type
    const [currentInMetalType, setCurrentInMetalType] = useState('');

    // State to store fetched karagir entries
    const [karagirEntries, setKaragirEntries] = useState([]);
    // State to hold details of a selected karagir entry for display
    const [selectedKaragirEntry, setSelectedKaragirEntry] = useState(null);
    // State to control the visibility of the update modal
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    // State to store the ID of the entry being updated
    const [updateId, setUpdateId] = useState(null);
    // State to determine if the update modal is for an 'in' or 'out' entry
    const [isUpdateInEntry, setIsUpdateInEntry] = useState(false);

    // Subtype options based on metal type (consistent with backend logic)
    const subtypeOptions = {
        gold: ["regular gold jewellery", "stone embedded gold jewellery"],
        silver: ["regular silver jewellery", "stone embedded silver jewellery"],
        others: ["precious", "semi-precious"]
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
    // Handles changes in Karagir-Out form input fields
    const handleOutInputChange = (e) => {
        const { name, value } = e.target;
        setKaragirOutFormData(prev => ({ ...prev, [name]: value }));
    };

    // Handles submission of Karagir-Out form
    const handleCreateOutEntry = async (e) => {
        e.preventDefault(); // Prevent default form submission behavior
        try {
            // Prepare payload for the API call
            const payload = {
                ...karagirOutFormData,
                entryType: 'out', // Explicitly set entry type
                // Ensure gramsGiven is a number
                gramsGiven: parseFloat(karagirOutFormData.gramsGiven),
            };

            // Make API call to create a new Karagir-Out entry
            const res = await fetch('/api/karagirleisures', { // Endpoint: /api/karagirleisures
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });

            const data = await res.json(); // Parse response
            if (!res.ok) {
                // Construct detailed error message from backend response
                const errorMessage = data.message || (data.errors && data.errors.map(err => err.message).join(', ')) || 'Failed to create Karagir-Out entry.';
                throw new Error(errorMessage);
            }
            // Success feedback
            alert('Karagir-Out entry created successfully!');
            setKaragirEntries(prev => [data, ...prev]); // Add new entry to state
            resetOutForm(); // Clear the form
        } catch (error) {
            console.error('Error creating Karagir-Out entry:', error);
            alert(`Error: ${error.message}`); // Show error to user
        }
    };

    // --- Karagir-In Form Handlers ---
    // Handles changes in Karagir-In form input fields
    const handleInInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'metalType') {
            setCurrentInMetalType(value); // Update metal type state for conditional rendering
            // Reset subtype, huidNo, karatCarat when metal type changes to avoid invalid combinations
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

    // Handles submission of Karagir-In form
    const handleCreateInEntry = async (e) => {
        e.preventDefault(); // Prevent default form submission behavior
        try {
            // --- Step 1: Check for pending Karagir-Out entries before creating Karagir-In ---
            const pendingOutCheckRes = await fetch(`/api/karagirleisures/pending-out?karagirName=${encodeURIComponent(karagirInFormData.karagirName)}&metalType=${encodeURIComponent(karagirInFormData.metalType)}`, { // Endpoint: /api/karagirleisures/pending-out
                method: 'GET',
                headers: getAuthHeaders()
            });
            const pendingOutData = await pendingOutCheckRes.json();

            if (!pendingOutCheckRes.ok) {
                throw new Error(pendingOutData.message || 'Failed to check pending out entries.');
            }

            // If pending entries exist, show a warning popup and ask for confirmation to proceed
            if (pendingOutData.hasPending) {
                const confirmProceed = window.confirm(
                    `WARNING: Karagir "${karagirInFormData.karagirName}" has ${pendingOutData.count} pending OUT entries for ${karagirInFormData.metalType}. Do you wish to continue and mark one as completed?`
                );
                if (!confirmProceed) {
                    alert('Karagir-In entry creation cancelled by user.');
                    return; // Stop function if user cancels
                }
            }

            // --- Step 2: Prepare and submit Karagir-In entry ---
            const payload = {
                ...karagirInFormData,
                entryType: 'in', // Explicitly set entry type
                // Ensure number fields are parsed as floats
                grossWeight: parseFloat(karagirInFormData.grossWeight),
                netWeight: parseFloat(karagirInFormData.netWeight),
                labourCharge: parseFloat(karagirInFormData.labourCharge),
                // Balance should always be a string as per schema
                balance: String(karagirInFormData.balance || "0")
            };

            // Conditionally remove HUID/KaratCarat from payload if not applicable to metal type
            if (karagirInFormData.metalType !== 'gold') {
                delete payload.huidNo;
            } else {
                delete payload.karatCarat;
            }

            // Make API call to create a new Karagir-In entry (which also creates an Item)
            const res = await fetch('/api/karagirleisures', { // Endpoint: /api/karagirleisures
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });

            const data = await res.json(); // Parse response
            if (!res.ok) {
                // Construct detailed error message from backend response
                const errorMessage = data.message || (data.errors && data.errors.map(err => err.message).join(', ')) || 'Failed to create Karagir-In entry.';
                throw new Error(errorMessage);
            }
            // Success feedback
            alert('Karagir-In entry created and Item added to inventory successfully!');
            setKaragirEntries(prev => [data, ...prev]); // Add new entry to state
            resetInForm(); // Clear the form
        } catch (error) {
            console.error('Error creating Karagir-In entry:', error);
            alert(`Error: ${error.message}`); // Show error to user
        }
    };

    // --- General Karagir Management Actions (GET, DELETE, UPDATE) ---

    // Fetches all Karagir entries for the authenticated vendor
    const handleGetAllKaragir = async () => {
        try {
            const res = await fetch('/api/karagirleisures', { // Endpoint: /api/karagirleisures
                method: 'GET',
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Failed to fetch all Karagir entries.');
            }
            setKaragirEntries(data); // Update state with all entries
            setSelectedKaragirEntry(null); // Clear any selected entry details
        } catch (error) {
            console.error('Error fetching all Karagir entries:', error);
            alert(`Error: ${error.message}`);
        }
    };

    // Fetches a single Karagir entry by its ID
    const handleGetKaragirById = async () => {
        const id = prompt('Enter Karagir Entry _id:'); // Prompt user for ID
        if (!id) return; // If no ID is entered, do nothing
        try {
            const res = await fetch(`/api/karagirleisures/${id}`, { // Endpoint: /api/karagirleisures/:id
                method: 'GET',
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Karagir entry not found.');
            }
            setKaragirEntries([data]); // Display only the fetched entry
            setSelectedKaragirEntry(data); // Set as selected entry for details display
        } catch (error) {
            console.error('Error fetching Karagir entry by ID:', error);
            alert(`Error: ${error.message}`);
        }
    };

    // Deletes all Karagir entries for the authenticated vendor
    const handleDeleteAllKaragir = async () => {
        // Confirmation dialog for a destructive action
        if (!window.confirm('Are you sure you want to DELETE ALL Karagir entries and their linked items? This action cannot be undone.')) {
            return;
        }
        try {
            const res = await fetch('/api/karagirleisures', { // Endpoint: /api/karagirleisures
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Failed to delete all Karagir entries.');
            }
            alert(data.message); // Show success message from backend
            setKaragirEntries([]); // Clear all entries from state
            setSelectedKaragirEntry(null); // Clear selected entry
        } catch (error) {
            console.error('Error deleting all Karagir entries:', error);
            alert(`Error: ${error.message}`);
        }
    };

    // Deletes a single Karagir entry by its ID
    const handleDeleteKaragirById = async (idToDelete) => {
        // Get ID either from button click or prompt
        const id = idToDelete || prompt('Enter Karagir Entry _id to delete:');
        if (!id) return;

        // Confirmation dialog
        if (!window.confirm(`Are you sure you want to delete Karagir entry ${id} and its linked item (if any)?`)) {
            return;
        }
        try {
            const res = await fetch(`/api/karagirleisures/${id}`, { // Endpoint: /api/karagirleisures/:id
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Failed to delete Karagir entry.');
            }
            alert(data.message); // Show success message
            // Remove the deleted entry from the state
            setKaragirEntries(prev => prev.filter(entry => entry._id !== id));
            // If the deleted entry was currently selected, clear selection
            if (selectedKaragirEntry?._id === id) {
                setSelectedKaragirEntry(null);
            }
        } catch (error) {
            console.error('Error deleting Karagir entry by ID:', error);
            alert(`Error: ${error.message}`);
        }
    };

    // Opens the update modal and populates it with selected entry's data
    const handleOpenUpdateModal = (entry) => {
        setUpdateId(entry._id); // Set ID of entry to be updated
        setIsUpdateInEntry(entry.entryType === 'in'); // Determine if it's an 'in' or 'out' entry

        // Populate form data based on entry type
        if (entry.entryType === 'in') {
            setCurrentInMetalType(entry.metalType); // Set metal type for dynamic fields
            setKaragirInFormData({
                karagirName: entry.karagirName || '',
                metalType: entry.metalType || '',
                subtype: entry.subtype || '',
                jewelleryName: entry.jewelleryName || '',
                huidNo: entry.huidNo || '',
                karatCarat: entry.karatCarat || '',
                grossWeight: entry.grossWeight ?? '', // Use nullish coalescing for numbers that might be 0
                netWeight: entry.netWeight ?? '',
                purityReceived: entry.purityReceived || '',
                labourCharge: entry.labourCharge ?? '',
                balance: entry.balance ?? ''
            });
        } else { // 'out' entry
            setKaragirOutFormData({
                karagirName: entry.karagirName || '',
                metalType: entry.metalType || '',
                remarks: entry.remarks || '',
                gramsGiven: entry.gramsGiven ?? '',
                purityGiven: entry.purityGiven || ''
            });
        }
        setShowUpdateModal(true); // Show the modal
    };

    // Handles submission of the update form
    const handleUpdateSubmit = async (e) => {
        e.preventDefault();
        if (!updateId) return; // Ensure an ID is set for update

        let payload = {};
        // Construct payload based on whether it's an 'in' or 'out' entry
        if (isUpdateInEntry) {
            payload = {
                ...karagirInFormData,
                entryType: 'in', // Maintain entry type
                grossWeight: parseFloat(karagirInFormData.grossWeight),
                netWeight: parseFloat(karagirInFormData.netWeight),
                labourCharge: parseFloat(karagirInFormData.labourCharge),
                balance: String(karagirInFormData.balance || "0")
            };
            // Conditionally remove HUID/KaratCarat from payload if not applicable to metal type
            if (karagirInFormData.metalType !== 'gold') {
                delete payload.huidNo;
            } else {
                delete payload.karatCarat;
            }
        } else {
            payload = {
                ...karagirOutFormData,
                entryType: 'out', // Maintain entry type
                gramsGiven: parseFloat(karagirOutFormData.gramsGiven),
            };
        }

        try {
            // Make API call to update the entry
            const res = await fetch(`/api/karagirleisures/${updateId}`, { // Endpoint: /api/karagirleisures/:id
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) {
                // Construct detailed error message
                const errorMessage = data.message || (data.errors && data.errors.map(err => err.message).join(', ')) || 'Failed to update Karagir entry.';
                throw new Error(errorMessage);
            }
            alert('Karagir entry updated successfully!');
            // Update the specific entry in the local state
            setKaragirEntries(prev => prev.map(entry => entry._id === data._id ? data : entry));
            // If the currently viewed details belong to this updated entry, refresh them
            if (selectedKaragirEntry?._id === data._id) {
                setSelectedKaragirEntry(data);
            }
            setShowUpdateModal(false); // Close the modal
            setUpdateId(null); // Clear update ID
            resetOutForm(); // Reset forms
            resetInForm();
        } catch (error) {
            console.error('Error updating Karagir entry:', error);
            alert(`Error: ${error.message}`);
        }
    };

    // Closes the update modal and resets relevant states
    const handleCloseUpdateModal = () => {
        setShowUpdateModal(false);
        setUpdateId(null);
        setIsUpdateInEntry(false);
        resetOutForm();
        resetInForm();
    };

    // --- Render Section ---
    return (
        <div className="karagir-manager">
            <h2>Karagir Management</h2>

            {/* Action Buttons */}
            <div className="karagir-actions-buttons">
                <button onClick={handleGetAllKaragir}>GET ALL KARAGIR ENTRIES</button>
                <button onClick={handleGetKaragirById}>GET KARAGIR ENTRY BY ID</button>
                <button onClick={handleDeleteAllKaragir}>DELETE ALL KARAGIR ENTRIES</button>
                <button onClick={() => handleDeleteKaragirById()}>DELETE KARAGIR ENTRY BY ID</button> {/* Pass no ID to prompt */}
            </div>

            <hr/> {/* Visual separator */}

            {/* Karagir-Out Entry Form */}
            <div className="form-section karagir-out-form">
                <h3>Create Karagir-Out Entry</h3>
                <form onSubmit={handleCreateOutEntry}>
                    <label>Karagir Name:</label>
                    <input type="text" name="karagirName" value={karagirOutFormData.karagirName} onChange={handleOutInputChange} required />

                    <label>Metal Type:</label>
                    <select name="metalType" value={karagirOutFormData.metalType} onChange={handleOutInputChange} required>
                        <option value="">Select Metal Type</option>
                        <option value="gold">Gold</option>
                        <option value="silver">Silver</option>
                        <option value="others">Others</option>
                    </select>

                    <label>Grams Given:</label>
                    <input type="number" name="gramsGiven" step="0.01" value={karagirOutFormData.gramsGiven} onChange={handleOutInputChange} required />

                    <label>Purity Given (e.g., 24k, 999):</label>
                    <input type="text" name="purityGiven" value={karagirOutFormData.purityGiven} onChange={handleOutInputChange} required />

                    <label>Remarks (Optional):</label>
                    <textarea name="remarks" value={karagirOutFormData.remarks} onChange={handleOutInputChange} rows="3"></textarea>

                    <button type="submit">Create Karagir-Out</button>
                </form>
            </div>

            <hr/> {/* Visual separator */}

            {/* Karagir-In Entry Form */}
            <div className="form-section karagir-in-form">
                <h3>Create Karagir-In Entry (Return from Karagir)</h3>
                <form onSubmit={handleCreateInEntry}>
                    <label>Karagir Name:</label>
                    <input type="text" name="karagirName" value={karagirInFormData.karagirName} onChange={handleInInputChange} required />

                    <label>Metal Type:</label>
                    <select name="metalType" value={karagirInFormData.metalType} onChange={handleInInputChange} required>
                        <option value="">Select Metal Type</option>
                        <option value="gold">Gold</option>
                        <option value="silver">Silver</option>
                        <option value="others">Others</option>
                    </select>

                    {/* Conditional rendering for Subtype based on selected Metal Type */}
                    {currentInMetalType && (
                        <>
                            <label>Subtype:</label>
                            <select name="subtype" value={karagirInFormData.subtype} onChange={handleInInputChange} required>
                                <option value="">Select Subtype</option>
                                {subtypeOptions[currentInMetalType]?.map(option => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        </>
                    )}

                    <label>Jewellery Name:</label>
                    <input type="text" name="jewelleryName" value={karagirInFormData.jewelleryName} onChange={handleInInputChange} required />

                    {/* Conditional rendering for HUID No (for Gold) */}
                    {currentInMetalType === 'gold' && (
                        <>
                            <label>HUID No (6 alphanumeric characters, unique):</label>
                            <input
                                type="text"
                                name="huidNo"
                                value={karagirInFormData.huidNo}
                                onChange={handleInInputChange}
                                pattern="[A-Za-z0-9]{6}" // HTML5 pattern for 6 alphanumeric characters
                                title="Enter exactly 6 alphanumeric characters (case-sensitive)"
                                required={currentInMetalType === 'gold'} // HUID is required only for gold
                            />
                        </>
                    )}

                    {/* Conditional rendering for Karat/Carat (for Silver/Others) */}
                    {(currentInMetalType === 'silver' || currentInMetalType === 'others') && (
                        <>
                            <label>Karat/Carat:</label>
                            <input
                                type="text"
                                name="karatCarat"
                                value={karagirInFormData.karatCarat}
                                onChange={handleInInputChange}
                                required={currentInMetalType === 'silver' || currentInMetalType === 'others'} // Required for silver/others
                            />
                        </>
                    )}

                    <label>Gross Weight:</label>
                    <input type="number" name="grossWeight" step="0.01" value={karagirInFormData.grossWeight} onChange={handleInInputChange} required />

                    <label>Net Weight:</label>
                    <input type="number" name="netWeight" step="0.01" value={karagirInFormData.netWeight} onChange={handleInInputChange} required />

                    <label>Purity Received (e.g., 22k, 916):</label>
                    <input type="text" name="purityReceived" value={karagirInFormData.purityReceived} onChange={handleInInputChange} required />

                    <label>Labour Charge:</label>
                    <input type="number" name="labourCharge" step="0.01" value={karagirInFormData.labourCharge} onChange={handleInInputChange} required />

                    <label>Balance:</label>
                    <input type="text" name="balance" value={karagirInFormData.balance} onChange={handleInInputChange} />

                    <label>Remarks (Optional):</label>
                    <textarea name="remarks" value={karagirInFormData.remarks} onChange={handleInInputChange} rows="3"></textarea>

                    <button type="submit">Create Karagir-In & Add Item</button>
                </form>
            </div>

            <hr/> {/* Visual separator */}

            {/* Karagir Entries Table Display */}
            {karagirEntries.length > 0 && (
                <div className="karagir-entries-table">
                    <h3>All Karagir Entries</h3>
                    <table className="karagir-table"> {/* Added karagir-table class */}
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Type</th>
                                <th>Name</th>
                                <th>Metal</th>
                                <th>Status</th>
                                <th>Grams/Weight</th>
                                <th>Purity Given</th> {/* Specific to Karagir-Out */}
                                <th>Ornament Name</th>
                                <th>Purity Received</th> {/* Specific to Karagir-In */}
                                <th>Subtype</th>
                                <th>HUID/Karat</th>
                                <th>Created At</th> {/* Added Created At column */}
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
                                        {/* Display grams given for 'out' and gross/net for 'in' */}
                                        {entry.entryType === 'out' ? `${entry.gramsGiven}g` : `${entry.grossWeight}g (Gross), ${entry.netWeight}g (Net)`}
                                    </td>
                                    <td>{entry.entryType === 'out' ? (entry.purityGiven || 'N/A') : 'NA'}</td>
                                    <td>{entry.entryType === 'in' ? (entry.jewelleryName || 'N/A') : 'NA'}</td>
                                    <td>{entry.entryType === 'in' ? (entry.purityReceived || 'N/A') : 'NA'}</td>
                                    <td>{entry.entryType === 'in' ? (entry.subtype || 'N/A') : 'NA'}</td>
                                    <td>
                                        {/* Display HUID or Karat/Carat based on metal type for 'in' entries */}
                                        {entry.entryType === 'in'
                                            ? (entry.metalType === 'gold' ? (entry.huidNo || 'N/A') : (entry.karatCarat || 'N/A'))
                                            : 'NA'
                                        }
                                    </td>
                                    <td>{new Date(entry.createdAt).toLocaleString()}</td> {/* Display formatted date */}
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

            <hr/> {/* Visual separator */}

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
                        <h3>Update Karagir Entry ID: {updateId}</h3>
                        {/* Render 'in' or 'out' form based on the type of entry being updated */}
                        {isUpdateInEntry ? (
                            <form onSubmit={handleUpdateSubmit}>
                                {/* Karagir-In Update Fields */}
                                <label>Karagir Name:</label>
                                <input type="text" name="karagirName" value={karagirInFormData.karagirName} onChange={handleInInputChange} required />

                                <label>Metal Type:</label>
                                <select name="metalType" value={karagirInFormData.metalType} onChange={handleInInputChange} required>
                                    <option value="gold">Gold</option>
                                    <option value="silver">Silver</option>
                                    <option value="others">Others</option>
                                </select>

                                {currentInMetalType && (
                                    <>
                                        <label>Subtype:</label>
                                        <select name="subtype" value={karagirInFormData.subtype} onChange={handleInInputChange} required>
                                            <option value="">Select Subtype</option>
                                            {subtypeOptions[currentInMetalType]?.map(option => (
                                                <option key={option} value={option}>{option}</option>
                                            ))}
                                        </select>
                                    </>
                                )}

                                <label>Jewellery Name:</label>
                                <input type="text" name="jewelleryName" value={karagirInFormData.jewelleryName} onChange={handleInInputChange} required />

                                {currentInMetalType === 'gold' && (
                                    <>
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
                                    </>
                                )}

                                {(currentInMetalType === 'silver' || currentInMetalType === 'others') && (
                                    <>
                                        <label>Karat/Carat:</label>
                                        <input
                                            type="text"
                                            name="karatCarat"
                                            value={karagirInFormData.karatCarat}
                                            onChange={handleInInputChange}
                                            required={currentInMetalType === 'silver' || currentInMetalType === 'others'}
                                        />
                                    </>
                                )}

                                <label>Gross Weight:</label>
                                <input type="number" name="grossWeight" step="0.01" value={karagirInFormData.grossWeight} onChange={handleInInputChange} required />

                                <label>Net Weight:</label>
                                <input type="number" name="netWeight" step="0.01" value={karagirInFormData.netWeight} onChange={handleInInputChange} required />

                                <label>Purity Received (e.g., 22k, 916):</label>
                                <input type="text" name="purityReceived" value={karagirInFormData.purityReceived} onChange={handleInInputChange} required />

                                <label>Labour Charge:</label>
                                <input type="number" name="labourCharge" step="0.01" value={karagirInFormData.labourCharge} onChange={handleInInputChange} required />

                                <label>Balance:</label>
                                <input type="text" name="balance" value={karagirInFormData.balance} onChange={handleInInputChange} />

                                <label>Remarks (Optional):</label>
                                <textarea name="remarks" value={karagirInFormData.remarks} onChange={handleInInputChange} rows="3"></textarea>

                                <button type="submit">Update Karagir-In Entry</button>
                            </form>
                        ) : (
                            <form onSubmit={handleUpdateSubmit}>
                                {/* Karagir-Out Update Fields */}
                                <label>Karagir Name:</label>
                                <input type="text" name="karagirName" value={karagirOutFormData.karagirName} onChange={handleOutInputChange} required />

                                <label>Metal Type:</label>
                                <select name="metalType" value={karagirOutFormData.metalType} onChange={handleOutInputChange} required>
                                    <option value="gold">Gold</option>
                                    <option value="silver">Silver</option>
                                    <option value="others">Others</option>
                                </select>

                                <label>Grams Given:</label>
                                <input type="number" name="gramsGiven" step="0.01" value={karagirOutFormData.gramsGiven} onChange={handleOutInputChange} required />

                                <label>Purity Given (e.g., 24k, 999):</label>
                                <input type="text" name="purityGiven" value={karagirOutFormData.purityGiven} onChange={handleOutInputChange} required />

                                <label>Remarks (Optional):</label>
                                <textarea name="remarks" value={karagirOutFormData.remarks} onChange={handleOutInputChange} rows="3"></textarea>

                                <button type="submit">Update Karagir-Out Entry</button>
                            </form>
                        )}
                        <button onClick={handleCloseUpdateModal} className="close-modal-button">Close</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default KaragirForm;
