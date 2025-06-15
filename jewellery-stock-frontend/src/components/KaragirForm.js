import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './KaragirForm.css';

function KaragirForm() {
    // State variables for form management and data display
    const [actionType, setActionType] = useState('in'); // 'in' or 'out'
    const [karagirList, setKaragirList] = useState([]); // List of karagir entries
    const [selectedEntry, setSelectedEntry] = useState(null); // Not explicitly used in rendering but kept for consistency
    const [showModal, setShowModal] = useState(false); // Controls update modal visibility
    const [updateId, setUpdateId] = useState(null); // Stores the ID of the entry being updated

    // Options for subtypes based on metal type
    const subtypeOptions = {
        gold: ["regular gold jewellery", "stone embedded gold jewellery"],
        silver: ["regular silver jewellery", "stone embedded silver jewellery"],
        others: ["precious", "semi-precious"]
    };

    // Initial state for the form data
    const initialFormData = {
        metalType: '',
        grams: '',
        ornamentName: '',
        labourCharge: '',
        karatOrHUID_Karagir: '', // This will hold HUID for gold, Karat/Carat for others
        grossWeight: '',
        netWeight: '',
        subtype: '',
        karagirName: '',
        status: 'pending', // Default status for 'out' entries
        remarks: '',
        purity: '',       // Specific to karagir-out
        balance: ''       // Specific to karagir-in
    };

    const [formData, setFormData] = useState({ ...initialFormData });

    // Function to get authentication headers from localStorage
    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return {
            Authorization: `Bearer ${token}`
        };
    };

    // Handles changes to form input fields
    const handleInputChange = (e) => {
        const { name, value } = e.target;

        if (name === 'metalType') {
            setFormData(prev => ({
                ...prev,
                [name]: value,
                subtype: '', // Reset subtype when metalType changes
                karatOrHUID_Karagir: '' // Reset HUID/Karat when metalType changes
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }

        // Check for pending 'out' entries if actionType is 'in' and karagirName is entered
        if (name === 'karagirName' && actionType === 'in' && value.trim() !== '') {
            checkPendingOut(value.trim());
        }
    };

    // Checks if a karagir has pending 'out' entries
    const checkPendingOut = async (karagirNameToCheck) => {
        try {
            const res = await axios.get(
                `/api/karagirleisures?actionType=out&status=pending&karagirName=${encodeURIComponent(karagirNameToCheck)}`,
                { headers: getAuthHeaders() }
            );
            if (Array.isArray(res.data) && res.data.length > 0) {
                toast.warn('This karagir has pending out entries', {
                    position: 'top-right',
                    autoClose: 3000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true
                });
            }
        } catch (err) {
            console.error('Error checking pending out:', err);
            // Optionally, show an error toast if checking fails
            // toast.error('Failed to check pending out entries.', { autoClose: 2000 });
        }
    };

    // Fetches all karagir entries from the API
    const fetchAllKaragirs = useCallback(async () => {
        try {
            const res = await axios.get('/api/karagirleisures', { headers: getAuthHeaders() });
            setKaragirList(res.data);
            setSelectedEntry(null); // Clear selected entry after fetching all
        } catch (err) {
            console.error('Error fetching all Karagir entries:', err);
            toast.error('Failed to load Karagir entries', { autoClose: 2000 });
        }
    }, []); // Empty dependency array means this function is memoized and only created once

    // Handles form submission for creating new entries
    const handleSubmit = async (e) => {
        e.preventDefault(); // Prevent default form submission behavior

        // Basic validation before creating the payload
        if (!formData.karagirName || !formData.metalType) {
            toast.error('Please fill in Karagir Name and Metal Type.', { autoClose: 2000 });
            return;
        }

        const payload = {
            actionType,
            karagirName: formData.karagirName,
            metalType: formData.metalType,
            remarks: formData.remarks || '' // Ensure remarks is always a string
        };

        if (actionType === 'out') {
            payload.grams = parseFloat(formData.grams) || 0;
            payload.status = 'pending'; // 'out' entries are typically pending initially
            payload.purity = formData.purity;
            if (!formData.grams || !formData.purity) {
                toast.error('Please fill in Grams and Purity for Out entry.', { autoClose: 2000 });
                return;
            }
        } else { // actionType === 'in'
            payload.ornamentName = formData.ornamentName;
            payload.labourCharge = parseFloat(formData.labourCharge) || 0;
            payload.grossWeight = parseFloat(formData.grossWeight) || 0;
            payload.netWeight = parseFloat(formData.netWeight) || 0;
            payload.subtype = formData.subtype;
            payload.balance = formData.balance;

            if (formData.metalType === 'gold') {
                payload.huidNo = formData.karatOrHUID_Karagir;
                // Basic HUID validation
                if (!payload.huidNo || !/^[a-zA-Z0-9]{6}$/.test(payload.huidNo)) {
                    toast.error('HUID No must be 6 alphanumeric characters.', { autoClose: 2000 });
                    return;
                }
            } else if (formData.metalType === 'silver' || formData.metalType === 'others') {
                payload.karatCarat = formData.karatOrHUID_Karagir;
            }

            // Basic validation for 'in' specific fields
            if (!formData.ornamentName || !formData.labourCharge || !formData.grossWeight || !formData.netWeight || !formData.subtype || !formData.balance || !formData.karatOrHUID_Karagir) {
                toast.error('Please fill in all required fields for In entry.', { autoClose: 2000 });
                return;
            }
        }

        try {
            await axios.post('/api/karagirleisures', payload, { headers: getAuthHeaders() });
            toast.success('Karagir entry submitted', { autoClose: 2000 });
            fetchAllKaragirs(); // Refresh the list
            setFormData({ ...initialFormData, metalType: '', subtype: '' }); // Reset form
        } catch (err) {
            console.error('Error submitting Karagir entry:', err);
            const message = err.response?.data?.message || err.message;
            toast.error(`Submission failed: ${message}`, { autoClose: 3000 });
        }
    };

    // Fetches a single karagir entry by ID
    const handleGetById = async () => {
        const id = prompt('Enter Karagir _id:');
        if (!id) return;
        try {
            const res = await axios.get(`/api/karagirleisures/${id}`, { headers: getAuthHeaders() });
            setKaragirList([res.data]); // Display only the fetched entry
            setSelectedEntry(res.data); // Set selected entry
        } catch (err) {
            console.error('Error fetching Karagir by ID:', err);
            toast.error('Could not fetch entry. Check the ID.', { autoClose: 2000 });
        }
    };

    // Deletes a single karagir entry by ID
    const handleDeleteById = async () => {
        const id = prompt('Enter Karagir _id to delete:');
        if (!id) return;
        if (!window.confirm(`Are you sure you want to delete entry with ID: ${id}?`)) return;
        try {
            await axios.delete(`/api/karagirleisures/${id}`, { headers: getAuthHeaders() });
            toast.success('Entry deleted', { autoClose: 2000 });
            fetchAllKaragirs(); // Refresh the list
        } catch (err) {
            console.error('Error deleting Karagir by ID:', err);
            toast.error('Delete failed. Check the ID.', { autoClose: 2000 });
        }
    };

    // Deletes all karagir entries (with confirmation)
    const handleDeleteAll = async () => {
        if (!window.confirm('Are you sure you want to delete ALL Karagir entries? This action cannot be undone.')) return;
        try {
            await axios.delete('/api/karagirleisures', { headers: getAuthHeaders() });
            toast.success('All entries deleted', { autoClose: 2000 });
            setKaragirList([]); // Clear the list in UI
            setSelectedEntry(null);
        } catch (err) {
            console.error('Error deleting all Karagir entries:', err);
            toast.error('Failed to delete all entries', { autoClose: 2000 });
        }
    };

    // Populates the modal form with data for updating an entry
    const handleUpdateById = async () => {
        const id = prompt('Enter Karagir _id to update:');
        if (!id) return;
        try {
            const res = await axios.get(`/api/karagirleisures/${id}`, { headers: getAuthHeaders() });
            const data = res.data;

            setFormData({
                metalType: data.metalType || '',
                grams: data.grams ?? '', // Use nullish coalescing for numbers
                ornamentName: data.ornamentName || '',
                labourCharge: data.labourCharge ?? '',
                // Set karatOrHUID_Karagir based on metalType
                karatOrHUID_Karagir: (data.metalType === 'gold' ? data.huidNo : data.karatCarat) || '',
                grossWeight: data.grossWeight ?? '',
                netWeight: data.netWeight ?? '',
                subtype: data.subtype || '',
                karagirName: data.karagirName || '',
                status: data.status || 'pending', // Default to pending if not present
                remarks: data.remarks || '',
                purity: data.purity || '',
                balance: data.balance || ''
            });
            setUpdateId(data._id); // Store the ID of the entry being updated
            setActionType(data.actionType); // Set action type for modal form
            setShowModal(true); // Show the update modal
        } catch (err) {
            console.error('Error loading Karagir entry for update:', err);
            toast.error('Failed to load entry. Check the ID.', { autoClose: 2000 });
        }
    };

    // Handles the submission of the update form in the modal
    const handleUpdateSubmit = async () => {
        if (!updateId) {
            toast.error('No entry selected for update.', { autoClose: 2000 });
            return;
        }

        // Basic validation before updating the payload
        if (!formData.karagirName || !formData.metalType) {
            toast.error('Please fill in Karagir Name and Metal Type.', { autoClose: 2000 });
            return;
        }

        const payload = {
            actionType,
            karagirName: formData.karagirName,
            metalType: formData.metalType,
            remarks: formData.remarks || ''
        };

        if (actionType === 'out') {
            payload.grams = parseFloat(formData.grams) || 0;
            payload.status = formData.status || 'pending';
            payload.purity = formData.purity;
            if (!formData.grams || !formData.purity) {
                toast.error('Please fill in Grams and Purity for Out entry.', { autoClose: 2000 });
                return;
            }
        } else { // actionType === 'in'
            payload.ornamentName = formData.ornamentName;
            payload.labourCharge = parseFloat(formData.labourCharge) || 0;
            payload.grossWeight = parseFloat(formData.grossWeight) || 0;
            payload.netWeight = parseFloat(formData.netWeight) || 0;
            payload.subtype = formData.subtype;
            payload.balance = formData.balance;

            if (formData.metalType === 'gold') {
                payload.huidNo = formData.karatOrHUID_Karagir;
                // Basic HUID validation
                if (!payload.huidNo || !/^[a-zA-Z0-9]{6}$/.test(payload.huidNo)) {
                    toast.error('HUID No must be 6 alphanumeric characters.', { autoClose: 2000 });
                    return;
                }
            } else if (formData.metalType === 'silver' || formData.metalType === 'others') {
                payload.karatCarat = formData.karatOrHUID_Karagir;
            }
            // Basic validation for 'in' specific fields in update modal
            if (!formData.ornamentName || !formData.labourCharge || !formData.grossWeight || !formData.netWeight || !formData.subtype || !formData.balance || !formData.karatOrHUID_Karagir) {
                toast.error('Please fill in all required fields for In entry.', { autoClose: 2000 });
                return;
            }
        }

        try {
            await axios.put(`/api/karagirleisures/${updateId}`, payload, { headers: getAuthHeaders() });
            toast.success('Entry updated', { autoClose: 2000 });
            setShowModal(false); // Close the modal
            setUpdateId(null); // Clear update ID
            fetchAllKaragirs(); // Refresh the list
        } catch (err) {
            console.error('Error updating Karagir entry:', err);
            const message = err.response?.data?.message || err.message;
            toast.error(`Update failed: ${message}`, { autoClose: 2000 });
        }
    };

    // Effect hook to fetch all karagirs when the component mounts
    useEffect(() => {
        fetchAllKaragirs();
    }, [fetchAllKaragirs]); // Add fetchAllKaragirs to dependency array

    // Handles closing the update modal and resetting related states
    const handleModalClose = () => {
        setShowModal(false);
        setUpdateId(null);
        setFormData({ ...initialFormData, metalType: '', subtype: '' }); // Reset form data on close
    };

    return (
        <div className="karagir-manager-container">
            <ToastContainer />
            <h3>Karagir In-Out Management</h3>

            <div className="karagir-action-form">
                <label>
                    Action:
                    <select
                        value={actionType}
                        onChange={(e) => {
                            setActionType(e.target.value);
                            setFormData({ ...initialFormData, metalType: '', subtype: '' }); // Reset form when action type changes
                        }}
                    >
                        <option value="in">In</option>
                        <option value="out">Out</option>
                    </select>
                </label>

                <div className="karagir-common-fields">
                    <input
                        type="text"
                        name="karagirName"
                        placeholder="Karagir Name"
                        value={formData.karagirName}
                        onChange={handleInputChange}
                        required
                    />
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
                    <input
                        type="text"
                        name="remarks"
                        placeholder="Remarks (Optional)"
                        value={formData.remarks}
                        onChange={handleInputChange}
                    />
                </div>

                {actionType === 'in' && (
                    <div className="karagir-in-fields">
                        <input
                            type="text" // Changed to text as ornament names can be descriptive
                            name="ornamentName"
                            placeholder="Ornament Name"
                            value={formData.ornamentName}
                            onChange={handleInputChange}
                            required
                        />
                        <input
                            type="number"
                            name="labourCharge"
                            placeholder="Labour Charge"
                            step="0.01"
                            value={formData.labourCharge}
                            onChange={handleInputChange}
                            required
                        />

                        {formData.metalType === 'gold' && (
                            <input
                                type="text"
                                name="karatOrHUID_Karagir"
                                placeholder="HUID No (6 alphanumeric)"
                                value={formData.karatOrHUID_Karagir}
                                onChange={handleInputChange}
                                pattern="[a-zA-Z0-9]{6}"
                                title="HUID must be 6 alphanumeric characters"
                                required
                            />
                        )}
                        {(formData.metalType === 'silver' || formData.metalType === 'others') && (
                            <input
                                type="text"
                                name="karatOrHUID_Karagir"
                                placeholder="Karat / Carat"
                                value={formData.karatOrHUID_Karagir}
                                onChange={handleInputChange}
                                required
                            />
                        )}

                        <input
                            type="number"
                            name="grossWeight"
                            placeholder="Gross Weight (grams)"
                            step="0.01"
                            value={formData.grossWeight}
                            onChange={handleInputChange}
                            required
                        />
                        <input
                            type="number"
                            name="netWeight"
                            placeholder="Net Weight (grams)"
                            step="0.01"
                            value={formData.netWeight}
                            onChange={handleInputChange}
                            required
                        />
                        <input
                            type="text"
                            name="balance"
                            placeholder="Balance (e.g., 20g gold)"
                            value={formData.balance}
                            onChange={handleInputChange}
                            required
                        />
                        {formData.metalType && (
                            <select
                                name="subtype"
                                value={formData.subtype}
                                onChange={handleInputChange}
                                required
                            >
                                <option value="">Select Subtype</option>
                                {subtypeOptions[formData.metalType]?.map(option => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        )}
                    </div>
                )}

                {actionType === 'out' && (
                    <div className="karagir-out-fields">
                        <input
                            type="number"
                            name="grams"
                            placeholder="Grams"
                            step="0.01"
                            value={formData.grams}
                            onChange={handleInputChange}
                            required
                        />
                        <input
                            type="text"
                            name="purity"
                            placeholder="Purity (e.g., 24k, 22k)"
                            value={formData.purity}
                            onChange={handleInputChange}
                            required
                        />
                    </div>
                )}

                <button className="karagir-submit-button" onClick={handleSubmit}>
                    Submit Karagir Entry
                </button>
            </div>

            <div className="karagir-control-buttons">
                <button onClick={fetchAllKaragirs}>GET ALL KARAGIRS</button>
                <button onClick={handleGetById}>GET KARAGIR BY ID</button>
                <button onClick={handleDeleteAll} className="delete-all-button">DELETE ALL KARAGIRS</button>
                <button onClick={handleDeleteById} className="delete-button">DELETE KARAGIR BY ID</button>
                <button onClick={handleUpdateById}>UPDATE KARAGIR BY ID</button>
            </div>

            {Array.isArray(karagirList) && karagirList.length > 0 && (
                <table className="karagir-table">
                    <thead>
                        <tr>
                            <th>_id</th>
                            <th>Karagir Name</th>
                            <th>Action</th>
                            <th>Metal Type</th>
                            <th>Grams/Ornament</th>
                            <th>Purity</th>
                            <th>Labour Charge</th>
                            <th>Karat/HUID</th>
                            <th>Gross Weight</th>
                            <th>Net Weight</th>
                            <th>Balance</th>
                            <th>Subtype</th>
                            <th className="remarks-col">Remarks</th>
                            <th>Status</th>
                            <th>Created At</th>
                        </tr>
                    </thead>
                    <tbody>
                        {karagirList.map((entry) => (
                            <tr key={entry._id}>
                                <td>{entry._id}</td>
                                <td>{entry.karagirName}</td>
                                <td>
                                    <span className={entry.actionType === 'out' ? 'badge badge-warning' : 'badge badge-info'}>
                                        {entry.actionType.toUpperCase()}
                                    </span>
                                </td>
                                <td>{entry.metalType}</td>
                                <td>
                                    {entry.actionType === 'out' ? entry.grams : entry.ornamentName}
                                </td>
                                <td>{entry.purity || 'NA'}</td>
                                <td>
                                    {entry.actionType === 'in' ? entry.labourCharge : 'NA'}
                                </td>
                                <td>
                                    {entry.actionType === 'in'
                                        ? (entry.metalType === 'gold' ? entry.huidNo : entry.karatCarat)
                                        : 'NA'}
                                </td>
                                <td>
                                    {entry.actionType === 'in' ? entry.grossWeight : 'NA'}
                                </td>
                                <td>
                                    {entry.actionType === 'in' ? entry.netWeight : 'NA'}
                                </td>
                                <td>
                                    {entry.actionType === 'in' ? entry.balance : 'NA'}
                                </td>
                                <td>
                                    {entry.actionType === 'in' ? entry.subtype : 'NA'}
                                </td>
                                <td className="remarks-col">{entry.remarks || 'N/A'}</td> {/* Display N/A if remarks is empty */}
                                <td>
                                    {entry.status === 'pending' ? (
                                        <span className="badge badge-pending">Pending</span>
                                    ) : (
                                        <span className="badge badge-completed">Completed</span>
                                    )}
                                </td>
                                <td>{new Date(entry.createdAt).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {/* Update Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>Update Karagir Entry: {updateId}</h3>

                        <label>Action:</label>
                        <select
                            value={actionType}
                            onChange={(e) => {
                                setActionType(e.target.value);
                                // Reset form data when changing action type in modal
                                setFormData({ ...initialFormData, metalType: '', subtype: '' });
                            }}
                            // It's generally better to prevent changing actionType during update
                            // if the backend logic depends on the original actionType.
                            // If your API allows changing actionType on update, remove `disabled`.
                            disabled={true}
                        >
                            <option value="in">In</option>
                            <option value="out">Out</option>
                        </select>

                        <label>Karagir Name:</label>
                        <input
                            type="text"
                            name="karagirName"
                            value={formData.karagirName}
                            onChange={handleInputChange}
                            required
                        />

                        <label>Metal Type:</label>
                        <select
                            name="metalType"
                            value={formData.metalType}
                            onChange={handleInputChange}
                            // Metal type is often fixed for an existing entry.
                            // If your backend allows changing it, remove `disabled`.
                            disabled={true}
                        >
                            <option value="">Select Metal Type</option>
                            <option value="gold">Gold</option>
                            <option value="silver">Silver</option>
                            <option value="others">Others</option>
                        </select>

                        {actionType === 'out' && (
                            <>
                                <label>Grams:</label>
                                <input
                                    type="number"
                                    name="grams"
                                    step="0.01"
                                    value={formData.grams}
                                    onChange={handleInputChange}
                                    required
                                />
                                <label>Purity:</label>
                                <input
                                    type="text"
                                    name="purity"
                                    value={formData.purity}
                                    onChange={handleInputChange}
                                    required
                                />
                                <label>Status:</label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleInputChange}
                                >
                                    <option value="pending">Pending</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </>
                        )}

                        {actionType === 'in' && (
                            <>
                                <label>Ornament Name:</label>
                                <input
                                    type="text"
                                    name="ornamentName"
                                    value={formData.ornamentName}
                                    onChange={handleInputChange}
                                    required
                                />
                                <label>Labour Charge:</label>
                                <input
                                    type="number"
                                    name="labourCharge"
                                    step="0.01"
                                    value={formData.labourCharge}
                                    onChange={handleInputChange}
                                    required
                                />
                                {formData.metalType === 'gold' && (
                                    <>
                                        <label>HUID No (6 alphanumeric):</label>
                                        <input
                                            type="text"
                                            name="karatOrHUID_Karagir"
                                            value={formData.karatOrHUID_Karagir}
                                            onChange={handleInputChange}
                                            pattern="[a-zA-Z0-9]{6}"
                                            title="HUID must be 6 alphanumeric characters"
                                            required
                                        />
                                    </>
                                )}
                                {(formData.metalType === 'silver' || formData.metalType === 'others') && (
                                    <>
                                        <label>Karat / Carat:</label>
                                        <input
                                            type="text"
                                            name="karatOrHUID_Karagir"
                                            value={formData.karatOrHUID_Karagir}
                                            onChange={handleInputChange}
                                            required
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
                                    required
                                />
                                <label>Net Weight:</label>
                                <input
                                    type="number"
                                    name="netWeight"
                                    step="0.01"
                                    value={formData.netWeight}
                                    onChange={handleInputChange}
                                    required
                                />
                                <label>Balance:</label>
                                <input
                                    type="text"
                                    name="balance"
                                    value={formData.balance}
                                    onChange={handleInputChange}
                                    required
                                />
                                {formData.metalType && (
                                    <>
                                        <label>Subtype:</label>
                                        <select
                                            name="subtype"
                                            value={formData.subtype}
                                            onChange={handleInputChange}
                                            required
                                        >
                                            <option value="">Select Subtype</option>
                                            {subtypeOptions[formData.metalType]?.map(option => (
                                                <option key={option} value={option}>{option}</option>
                                            ))}
                                        </select>
                                    </>
                                )}
                            </>
                        )}

                        <label>Remarks:</label>
                        <input
                            type="text"
                            name="remarks"
                            value={formData.remarks}
                            onChange={handleInputChange}
                        />

                        <div className="modal-buttons">
                            <button onClick={handleUpdateSubmit}>Save Changes</button>
                            <button onClick={handleModalClose}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default KaragirForm;