import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './CustomerForm.css';

function CustomerForm() {
    // ─── Local State ────────────────────────────────────────────────────────────
    const [actionType, setActionType] = useState('in'); // 'in' or 'out'
    const [customerList, setCustomerList] = useState([]);
    const [liveItems, setLiveItems] = useState([]); // Live items from inventory
    const [deletedItems, setDeletedItems] = useState([]); // Deleted items from inventory (for display)
    const [showUpdateModal, setShowUpdateModal] = useState(false); // For Update modal
    const [showItemSelectionModal, setShowItemSelectionModal] = useState(false); // For item selection modal
    const [updateId, setUpdateId] = useState(null);
    const [itemSearchTerm, setItemSearchTerm] = useState(''); // For searching items in selection modal
    const [isManualItemEntryForOut, setIsManualItemEntryForOut] = useState(false); // New: for manual item input in Customer-Out


    const emptyFormData = {
        customerName: '',
        customerAddress: '',
        customerContact: '',
        metalType: '', // Metal type of the item/transaction (only for 'out')
        paymentForm: '',
        purity: '', // For payment (grams_given)
        grams_given: '',
        equivalentAmount: '',
        cashAmount: '',
        otherPaymentNotes: '', // New field for 'other' payment form
        jewelleryName: '', // Item details (only for 'out')
        subtype: '', // Item details (only for 'out')
        grossWeight: '', // Item details (only for 'out')
        netWeight: '', // Item details (only for 'out')
        itemMetalPurity: '', // Item details (only for 'out')
        remarks: '',
        customerBalance: '', // New field (only for 'out')
    };
    const [formData, setFormData] = useState({ ...emptyFormData });

    // Subtype options based on metal type for item selection (only used for 'out' transactions)
    const subtypeOptions = {
        gold: ["regular gold jewellery", "stone embedded gold jewellery"],
        silver: ["regular silver jewellery", "stone embedded silver jewellery"],
        others: ["precious", "semi-precious"]
    };

    // Helper to grab the JWT from localStorage and build headers
    const getAuthHeaders = useCallback(() => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        };
    }, []);

    // ────────────────────────────────────────────────────────────────────────────────
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        if (actionType === 'out' && name === 'metalType' && isManualItemEntryForOut) {
            // Reset item-specific purity fields when metal type changes for manual input in OUT
            setFormData(prev => ({
                ...prev,
                metalType: value,
                itemMetalPurity: '' // Reset HUID/KaratCarat
            }));
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────
    // Handle change for paymentForm to clear/set conditional fields
    const handlePaymentFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
            // Clear other payment-related fields when paymentForm changes
            purity: '',
            grams_given: '',
            equivalentAmount: '',
            cashAmount: '',
            otherPaymentNotes: ''
        }));
    };

    // ────────────────────────────────────────────────────────────────────────────────
    const fetchAllCustomers = useCallback(async () => {
        try {
            const res = await axios.get('/api/customers', { headers: getAuthHeaders() });
            setCustomerList(res.data);
        } catch (err) {
            console.error('Error fetching all customers:', err);
            toast.error('Failed to load Customer entries', { autoClose: 2000 });
        }
    }, [getAuthHeaders]);

    // ────────────────────────────────────────────────────────────────────────────────
    // Fetch all items (live and deleted) for the item selection modal (only for 'out' type)
    const fetchAllItems = useCallback(async () => {
        try {
            const res = await axios.get('/api/items', { headers: getAuthHeaders() });
            const allItems = res.data;
            setLiveItems(allItems.filter(item => item.isActive));
            setDeletedItems(allItems.filter(item => !item.isActive));
        } catch (err) {
            console.error('Error fetching all items for selection:', err);
            toast.error('Failed to load inventory items.', { autoClose: 2000 });
        }
    }, [getAuthHeaders]);

    // Effect to fetch items when switching to 'out' action type
    useEffect(() => {
        if (actionType === 'out') {
            fetchAllItems();
        }
    }, [actionType, fetchAllItems]);

    // Initial fetch of all customers on component mount
    useEffect(() => {
        fetchAllCustomers();
    }, [fetchAllCustomers]);

    // ────────────────────────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                actionType,
                customerName: formData.customerName,
                customerAddress: formData.customerAddress,
                customerContact: formData.customerContact,
                paymentForm: formData.paymentForm,
                remarks: formData.remarks,
                // Conditional payment fields
                ...(formData.paymentForm === 'gold' || formData.paymentForm === 'silver' ? {
                    purity: formData.purity,
                    grams_given: parseFloat(formData.grams_given),
                    equivalentAmount: parseFloat(formData.equivalentAmount)
                } : {}),
                ...(formData.paymentForm === 'cash' || formData.paymentForm === 'cheque' ? {
                    cashAmount: parseFloat(formData.cashAmount)
                } : {}),
                ...(formData.paymentForm === 'other' ? {
                    otherPaymentNotes: formData.otherPaymentNotes
                } : {}),
            };

            // Add item-related fields ONLY if actionType is 'out'
            if (actionType === 'out') {
                Object.assign(payload, {
                    metalType: formData.metalType,
                    jewelleryName: formData.jewelleryName,
                    subtype: formData.subtype,
                    grossWeight: parseFloat(formData.grossWeight),
                    netWeight: parseFloat(formData.netWeight),
                    itemMetalPurity: formData.itemMetalPurity,
                    customerBalance: formData.customerBalance,
                    isManualEntry: isManualItemEntryForOut // Add this flag to indicate manual entry
                });
            }

            await axios.post(
                '/api/customers',
                payload,
                { headers: getAuthHeaders() }
            );
            toast.success('Customer entry submitted', { autoClose: 2000 });
            fetchAllCustomers(); // Refresh customer list
            if (actionType === 'out' && !isManualItemEntryForOut) {
                fetchAllItems(); // Only refresh items list if it was from inventory
            }
            setFormData({ ...emptyFormData }); // Reset form
            setActionType('in'); // Reset action type to 'in' after submission
            setIsManualItemEntryForOut(false); // Reset manual entry state
        } catch (err) {
            console.error('Error submitting Customer entry:', err);
            const msg = err.response?.data?.message || err.message;
            toast.error(`Submission failed: ${msg}`, { autoClose: 3000 });
        }
    };


    // ────────────────────────────────────────────────────────────────────────────────
    const handleGetById = async () => {
        const id = prompt('Enter Customer transaction _id:');
        if (!id) return;
        try {
            const res = await axios.get(`/api/customers/${id}`, { headers: getAuthHeaders() });
            setCustomerList([res.data]); // Display only the fetched item
        } catch (err) {
            console.error('Error fetching Customer by ID:', err);
            toast.error('Could not fetch entry. Check the ID.', { autoClose: 2000 });
            setCustomerList([]); // Clear list if not found
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────
    const handleDeleteById = async () => {
        const id = prompt('Enter Customer _id to delete:');
        if (!id) return;
        try {
            await axios.delete(`/api/customers/${id}`, { headers: getAuthHeaders() });
            toast.success('Entry deleted', { autoClose: 2000 });
            fetchAllCustomers(); // Refresh list
            fetchAllItems(); // Also refresh items as status might change
        } catch (err) {
            console.error('Error deleting Customer by ID:', err);
            toast.error('Delete failed. Check the ID.', { autoClose: 2000 });
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────
    const handleDeleteAll = async () => {
        if (!window.confirm('Delete ALL Customer entries? This will also re-activate linked items from Customer-Out transactions!')) return;
        try {
            await axios.delete('/api/customers', { headers: getAuthHeaders() });
            toast.success('All entries deleted and linked items re-activated', { autoClose: 2000 });
            setCustomerList([]);
            fetchAllItems(); // Refresh items as some might have been re-activated
        } catch (err) {
            console.error('Error deleting all Customer entries:', err);
            toast.error('Failed to delete all entries', { autoClose: 2000 });
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────
    const handleUpdateById = async () => {
        const id = prompt('Enter Customer transaction _id:');
        if (!id) return;
        try {
            const res = await axios.get(`/api/customers/${id}`, { headers: getAuthHeaders() });
            const data = res.data;

            // Convert null values to empty strings for form display
            const processedData = {};
            for (const key in data) {
                processedData[key] = data[key] === null ? '' : data[key];
            }

            // Determine if it was a manual entry for 'out'
            const wasManualOut = data.actionType === 'out' && !data.linkedItemId;
            setIsManualItemEntryForOut(wasManualOut);

            setFormData({
                ...emptyFormData,
                ...processedData
            });
            setUpdateId(data._id);
            setActionType(data.actionType);
            setShowUpdateModal(true);
        } catch (err) {
            console.error('Error loading Customer for update:', err);
            toast.error('Failed to load entry. Check the ID.', { autoClose: 2000 });
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────
    const handleUpdateSubmit = async () => {
        if (!updateId) return;
        try {
            // Prepare the payload with proper null handling
            const payload = {
                actionType,
                customerName: formData.customerName || null,
                customerAddress: formData.customerAddress || null,
                customerContact: formData.customerContact || null,
                paymentForm: formData.paymentForm,
                remarks: formData.remarks || null,
                // Convert empty strings to null for numeric fields
                purity: formData.purity || null,
                grams_given: formData.grams_given ? parseFloat(formData.grams_given) : null,
                equivalentAmount: formData.equivalentAmount ? parseFloat(formData.equivalentAmount) : null,
                cashAmount: formData.cashAmount ? parseFloat(formData.cashAmount) : null,
                otherPaymentNotes: formData.otherPaymentNotes || null,
            };

            // Add item-related fields ONLY if actionType is 'out'
            if (actionType === 'out') {
                Object.assign(payload, {
                    metalType: formData.metalType || null,
                    jewelleryName: formData.jewelleryName || null,
                    subtype: formData.subtype || null,
                    grossWeight: formData.grossWeight ? parseFloat(formData.grossWeight) : null,
                    netWeight: formData.netWeight ? parseFloat(formData.netWeight) : null,
                    itemMetalPurity: formData.itemMetalPurity || null,
                    customerBalance: formData.customerBalance || null,
                    isManualEntry: isManualItemEntryForOut
                })  ;
            }

            const response = await axios.put(
                `/api/customers/${updateId}`,
                payload,
                { headers: getAuthHeaders() }
            );

            // Handle the response data to ensure proper display
            const updatedData = response.data.updated;
            const processedData = {};
            for (const key in updatedData) {
                processedData[key] = updatedData[key] === null ? '' : updatedData[key];
            }

            toast.success('Entry updated', { autoClose: 2000 });
            setShowUpdateModal(false);
            setUpdateId(null);
            fetchAllCustomers();
            if (actionType === 'out' && !isManualItemEntryForOut) {
                fetchAllItems();
            }
            setFormData({ ...emptyFormData });
        } catch (err) {
            console.error('Error updating Customer entry:', err);
            const msg = err.response?.data?.message || err.message;
            toast.error(`Update failed: ${msg}`, { autoClose: 2000 });
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────
    const handleUpdateModalClose = () => {
        setShowUpdateModal(false);
        setUpdateId(null);
        setFormData({ ...emptyFormData });
    };

    // ────────────────────────────────────────────────────────────────────────────────
    const handleItemSelect = (item) => {
        // Auto-fill form data with selected item details
        setFormData(prev => ({
            ...prev,
            jewelleryName: item.jewelleryName,
            metalType: item.metalType,
            subtype: item.subtype,
            grossWeight: item.grossWeight,
            netWeight: item.netWeight,
            itemMetalPurity: item.karatOrHUID, // Use karatOrHUID as the combined purity field
            customerBalance: item.balance || '' // Carry over item balance as customer balance
        }));
        setIsManualItemEntryForOut(false); // Switch to selected item mode
        setShowItemSelectionModal(false); // Close the modal
    };

    // Filtered items for display in the selection modal
    const filteredLiveItems = liveItems.filter(item =>
        item.jewelleryName.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
        (item.subtype && item.subtype.toLowerCase().includes(itemSearchTerm.toLowerCase())) ||
        (item.metalType && item.metalType.toLowerCase().includes(itemSearchTerm.toLowerCase()))
    );

    const filteredDeletedItems = deletedItems.filter(item =>
        item.jewelleryName.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
        (item.subtype && item.subtype.toLowerCase().includes(itemSearchTerm.toLowerCase())) ||
        (item.metalType && item.metalType.toLowerCase().includes(itemSearchTerm.toLowerCase()))
    );

    // ────────────────────────────────────────────────────────────────────────────────
    return (
        <div className="customer-manager-container">
            <ToastContainer />

            <h3>Customer In-Out Management</h3>

            {/* Form Type Selection Buttons */}
            <div className="customer-form-type-selection">
    <button
                    className={actionType === 'in' ? 'active-form-btn' : ''}
                    onClick={() => {
                        setActionType('in');
                        setFormData({ ...emptyFormData });
                        setIsManualItemEntryForOut(false);
                    }}
                >
                    Customer In
                </button>
                <button
                    className={actionType === 'out' ? 'active-form-btn' : ''}
                    onClick={() => {
                        setActionType('out');
                        setFormData({ ...emptyFormData });
                        setIsManualItemEntryForOut(false);
                        fetchAllItems();
                    }}
                >
                    Customer Out
                </button>
            </div>

            {/* Main Form Section */}
            <form className="customer-action-form" onSubmit={handleSubmit}>
                {/* Common fields */}
                <div className="customer-common-fields">
                    <label>Customer Name:</label>
                    <input type="text" name="customerName" placeholder="Customer Name"
                        value={formData.customerName} onChange={handleInputChange} required />

                    <label>Address:</label>
                    <input type="text" name="customerAddress" placeholder="Address"
                        value={formData.customerAddress} onChange={handleInputChange} required />

                    <label>Contact:</label>
                    <input type="text" name="customerContact" placeholder="Contact"
                        value={formData.customerContact} onChange={handleInputChange} required />

                    <label>Payment Form:</label>
                    <select name="paymentForm" value={formData.paymentForm} onChange={handlePaymentFormChange} required>
                        <option value="">Select Payment Form</option>
                        <option value="gold">Gold</option>
                        <option value="silver">Silver</option>
                        <option value="cash">Cash</option>
                        <option value="cheque">Cheque</option>
                        <option value="other">Other</option>
                    </select>
                </div>

                {/* Conditional Payment Fields */}
                {(formData.paymentForm === 'gold' || formData.paymentForm === 'silver') && (
                    <div className="customer-metal-payment-fields">
                        <label>Purity (of metal given):</label>
                        <input type="text" name="purity" placeholder="Purity (e.g., 91.6)"
                            value={formData.purity} onChange={handleInputChange} required />

                        <label>Grams Given:</label>
                        <input type="number" name="grams_given" placeholder="Grams Given" step="0.01"
                            value={formData.grams_given} onChange={handleInputChange} required />

                        <label>Equivalent Amount:</label>
                        <input type="number" name="equivalentAmount" placeholder="Equivalent Amount" step="0.01"
                            value={formData.equivalentAmount} onChange={handleInputChange} required />
                    </div>
                )}

                {(formData.paymentForm === 'cash' || formData.paymentForm === 'cheque') && (
                    <div className="customer-cash-payment-fields">
                        <label>Cash Amount:</label>
                        <input type="number" name="cashAmount" placeholder="Cash Amount" step="0.01"
                            value={formData.cashAmount} onChange={handleInputChange} required />
                    </div>
                )}

                {formData.paymentForm === 'other' && (
                    <div className="customer-other-payment-fields">
                        <label>If Other, Specify:</label>
                        <input type="text" name="otherPaymentNotes" placeholder="e.g., Bank Transfer, Credit"
                            value={formData.otherPaymentNotes} onChange={handleInputChange} required />
                    </div>
                )}

                {/* ── Customer-Out Specific Item Fields ─────────────────────────────── */}
                {actionType === 'out' && (
                    <div className="customer-item-details-fields">
                        <div className="jewellery-name-group">
                            <label>Jewellery Name:</label>
                            <input
                                type="text"
                                name="jewelleryName"
                                placeholder="Jewellery Name"
                                value={formData.jewelleryName}
                                onChange={handleInputChange}
                                required
                                readOnly={!isManualItemEntryForOut} // Read-only if selecting from inventory
                            />
                            <div className="item-selection-buttons">
                                <button
                                    type="button"
                                    className={!isManualItemEntryForOut ? 'active-toggle' : ''}
                                    onClick={() => {
                                        setIsManualItemEntryForOut(false);
                                        setShowItemSelectionModal(true);
                                        // Clear item-related fields when switching to select mode
                                        setFormData(prev => ({
                                            ...prev,
                                            metalType: '', // Clear metal type when selecting
                                            jewelleryName: '',
                                            subtype: '',
                                            grossWeight: '',
                                            netWeight: '',
                                            itemMetalPurity: '',
                                            customerBalance: ''
                                        }));
                                    }}
                                >
                                    Select from Inventory
                                </button>
                                <button
                                    type="button"
                                    className={isManualItemEntryForOut ? 'active-toggle' : ''}
                                    onClick={() => {
                                        setIsManualItemEntryForOut(true);
                                        // Clear item-related fields when switching to manual mode
                                        setFormData(prev => ({
                                            ...prev,
                                            metalType: '', // Allow manual metal type input
                                            jewelleryName: '',
                                            subtype: '',
                                            grossWeight: '',
                                            netWeight: '',
                                            itemMetalPurity: '',
                                            customerBalance: ''
                                        }));
                                    }}
                                >
                                    Enter Manually
                                </button>
                            </div>
                        </div>

                        <label>Metal Type (of Item):</label>
                        <select name="metalType" value={formData.metalType} onChange={handleInputChange} required
                            disabled={!isManualItemEntryForOut}> {/* Disabled if selecting from inventory */}
                            <option value="">Select Metal Type</option>
                            <option value="gold">Gold</option>
                            <option value="silver">Silver</option>
                            <option value="others">Others (Stones, 1g Jewellery)</option>
                        </select>

                        <label>Subtype:</label>
                        <select name="subtype" value={formData.subtype} onChange={handleInputChange} required
                            disabled={!isManualItemEntryForOut}> {/* Disabled if selecting from inventory */}
                            <option value="">Select Subtype</option>
                            {formData.metalType && subtypeOptions[formData.metalType]?.map(option => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>

                        <label>Gross Weight:</label>
                        <input type="number" name="grossWeight" placeholder="Gross Weight" step="0.01"
                            value={formData.grossWeight} onChange={handleInputChange} required
                            readOnly={!isManualItemEntryForOut} />

                        <label>Net Weight:</label>
                        <input type="number" name="netWeight" placeholder="Net Weight" step="0.01"
                            value={formData.netWeight} onChange={handleInputChange} required
                            readOnly={!isManualItemEntryForOut} />

                        <label>Item Purity (HUID/Karat/Carat):</label>
                        <input
                            type="text"
                            name="itemMetalPurity"
                            placeholder="HUID / Karat/Carat"
                            value={formData.itemMetalPurity}
                            onChange={handleInputChange}
                            required={(isManualItemEntryForOut && (formData.metalType === 'gold' || formData.metalType === 'silver' || formData.metalType === 'others'))}
                            readOnly={!isManualItemEntryForOut}
                            // Client-side validation for HUID when metalType is gold and manual entry is active
                            pattern={isManualItemEntryForOut && formData.metalType === 'gold' ? '[A-Za-z0-9]{6}' : undefined}
                            title={isManualItemEntryForOut && formData.metalType === 'gold' ? 'Enter exactly 6 alphanumeric characters for HUID' : undefined}
                        />

                        <div className="customer-out-specific-fields">
                            <label>Customer Balance:</label>
                            <input type="text" name="customerBalance" placeholder="Customer left balance"
                                value={formData.customerBalance} onChange={handleInputChange} />
                        </div>
                    </div>
                )}

                {/* Remarks always visible */}
                <label>Remarks:</label>
                <textarea
                    name="remarks"
                    placeholder="Any additional remarks..."
                    value={formData.remarks}
                    onChange={handleInputChange}
                />

                {/* Submit button */}
                <button type="submit" className="customer-submit-button">
                    Submit Customer Entry
                </button>
            </form>

            {/* ───────────────────────────────────────────────────────────────────────── */}
            {/* C) Control Buttons: GET ALL, GET BY ID, DELETE ALL, DELETE BY ID, UPDATE */}
            {/* ───────────────────────────────────────────────────────────────────────── */}
            <div className="customer-control-buttons">
                <button onClick={fetchAllCustomers}>GET ALL CUSTOMERS</button>
                <button onClick={handleGetById}>GET CUSTOMER BY ID</button>
                <button onClick={handleDeleteAll}>DELETE ALL CUSTOMERS</button>
                <button onClick={handleDeleteById}>DELETE CUSTOMER BY ID</button>
                <button onClick={handleUpdateById}>UPDATE CUSTOMER BY ID</button>
            </div>

            {/* ───────────────────────────────────────────────────────────────────────── */}
            {/* D) Customer Entries Table */}
            {/* ───────────────────────────────────────────────────────────────────────── */}
            {Array.isArray(customerList) && customerList.length > 0 && (
                <div className="customer-table-container">
                    <table className="customer-table">
                        <thead>
                            <tr>
                                <th>Txn ID</th>
                                <th>Group ID</th>
                                <th>Action</th>
                                <th>Status</th>
                                <th>Customer Name</th>
                                <th className="customer-address-col">Address</th>
                                <th>Contact</th>
                                <th>Item Metal Type</th>
                                <th>Payment Form</th>
                                <th>Purity (Given)</th>
                                <th>Grams Given</th>
                                <th>Equivalent Amt</th>
                                <th>Cash Amount</th>
                                <th className="other-payment-notes-col">Other Pmt Notes</th>
                                <th>Jewellery</th>
                                <th>Subtype</th>
                                <th>Gross Wt</th>
                                <th>Net Wt</th>
                                <th>Item Purity</th>
                                <th>Customer Balance</th>
                                <th className="remarks-col">Remarks</th>
                                <th>Created At</th>
                            </tr>
                        </thead>
                        <tbody>
                        {customerList.map((entry) => {
                            // Helper function to display values properly
                            const displayValue = (value, isForOutOnly = false) => {
                                if (isForOutOnly && entry.actionType !== 'out') return 'N/A';
                                if (value === null || value === undefined) return 'N/A';
                                if (typeof value === 'number') return value;
                                return value;
                            };

                            // Special handling for payment-related fields
                            const displayPaymentValue = (value, paymentTypes) => {
                                if (!paymentTypes.includes(entry.paymentForm)) return 'N/A';
                                if (value === null || value === undefined || value === '') return 'N/A';
                                if (typeof value === 'number') return value;
                                return value;
                            };

                            return (
                                <tr key={entry._id}>
                                    <td>{entry._id}</td>
                                    <td>{displayValue(entry.transactionGroupId)}</td>
                                    <td>
                                        <span className={entry.actionType === 'out' ? 'badge badge-warning' : 'badge badge-info'}>
                                            {entry.actionType.toUpperCase()}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={'badge badge-completed'}>
                                            COMPLETED
                                        </span>
                                    </td>
                                    <td>{displayValue(entry.customerName)}</td>
                                    <td className="customer-address-col">{displayValue(entry.customerAddress)}</td>
                                    <td>{displayValue(entry.customerContact)}</td>
                                    <td>{displayValue(entry.metalType, true)}</td>
                                    <td>{displayValue(entry.paymentForm)}</td>
                                    <td>{displayPaymentValue(entry.purity, ['gold', 'silver'])}</td>
                                    <td>{displayPaymentValue(entry.grams_given, ['gold', 'silver'])}</td>
                                    <td>{displayPaymentValue(entry.equivalentAmount, ['gold', 'silver'])}</td>
                                    <td>{displayPaymentValue(entry.cashAmount, ['cash', 'cheque'])}</td>
                                    <td className="other-payment-notes-col">{displayPaymentValue(entry.otherPaymentNotes, ['other'])}</td>
                                    <td>{displayValue(entry.jewelleryName, true)}</td>
                                    <td>{displayValue(entry.subtype, true)}</td>
                                    <td>{displayValue(entry.grossWeight, true)}</td>
                                    <td>{displayValue(entry.netWeight, true)}</td>
                                    <td>{displayValue(entry.itemMetalPurity, true)}</td>
                                    <td>{displayValue(entry.customerBalance, true)}</td>
                                    <td className="remarks-col">{displayValue(entry.remarks)}</td>
                                    <td>{new Date(entry.createdAt).toLocaleString()}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        )}

            {/* ───────────────────────────────────────────────────────────────────────── */}
            {/* E) Update Modal (shown when showUpdateModal = true) */}
            {/* ───────────────────────────────────────────────────────────────────────── */}
        {showUpdateModal && (
            <div className="modal-overlay">
                <div className="modal-content">
                    <h3>Update Customer Entry: {updateId}</h3>

                    <label>Action Type:</label>
                    <select
                        name="actionType"
                        value={actionType}
                        onChange={(e) => setActionType(e.target.value)}
                        disabled
                    >
                        <option value="in">In</option>
                        <option value="out">Out</option>
                    </select>

                    <label>Customer Name:</label>
                    <input type="text" name="customerName" value={formData.customerName} onChange={handleInputChange} />

                    <label>Address:</label>
                    <input type="text" name="customerAddress" value={formData.customerAddress} onChange={handleInputChange} />

                    <label>Contact:</label>
                    <input type="text" name="customerContact" value={formData.customerContact} onChange={handleInputChange} />

                    <label>Payment Form:</label>
                    <select name="paymentForm" value={formData.paymentForm} onChange={handlePaymentFormChange}>
                        <option value="">Select Payment Form</option>
                        <option value="gold">Gold</option>
                        <option value="silver">Silver</option>
                        <option value="cash">Cash</option>
                        <option value="cheque">Cheque</option>
                        <option value="other">Other</option>
                    </select>

                    {/* Conditional Payment Fields in Modal */}
                    {(formData.paymentForm === 'gold' || formData.paymentForm === 'silver') && (
                        <>
                            <label>Purity (Grams Given):</label>
                            <input type="text" name="purity" value={formData.purity} onChange={handleInputChange} />
                            <label>Grams Given:</label>
                            <input type="number" name="grams_given" step="0.01" value={formData.grams_given} onChange={handleInputChange} />
                            <label>Equivalent Amount:</label>
                            <input type="number" name="equivalentAmount" step="0.01" value={formData.equivalentAmount} onChange={handleInputChange} />
                        </>
                    )}

                    {(formData.paymentForm === 'cash' || formData.paymentForm === 'cheque') && (
                        <>
                            <label>Cash Amount:</label>
                            <input type="number" name="cashAmount" step="0.01" value={formData.cashAmount} onChange={handleInputChange} />
                        </>
                    )}

                    {formData.paymentForm === 'other' && (
                        <>
                            <label>If Other, Specify:</label>
                            <input type="text" name="otherPaymentNotes" value={formData.otherPaymentNotes} onChange={handleInputChange} />
                        </>
                    )}

                        {/* Item details in update modal: Only for 'out' transactions */}
                        {actionType === 'out' && (
                            <>
                                <label>Jewellery Name:</label>
                                <input type="text" name="jewelleryName" value={formData.jewelleryName} onChange={handleInputChange}
                                    readOnly={!isManualItemEntryForOut} /> {/* Read-only if selected from inventory */}

                                <label>Metal Type (of Item):</label>
                                <select name="metalType" value={formData.metalType} onChange={handleInputChange}
                                    disabled={!isManualItemEntryForOut}>
                                    <option value="gold">Gold</option>
                                    <option value="silver">Silver</option>
                                    <option value="others">Others</option>
                                </select>

                                <label>Subtype:</label>
                                <select name="subtype" value={formData.subtype} onChange={handleInputChange}
                                    disabled={!isManualItemEntryForOut}>
                                    <option value="">Select Subtype</option>
                                    {formData.metalType && subtypeOptions[formData.metalType]?.map(option => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>

                                <label>Gross Weight:</label>
                                <input type="number" name="grossWeight" step="0.01" value={formData.grossWeight} onChange={handleInputChange}
                                    readOnly={!isManualItemEntryForOut} />

                                <label>Net Weight:</label>
                                <input type="number" name="netWeight" step="0.01" value={formData.netWeight} onChange={handleInputChange}
                                    readOnly={!isManualItemEntryForOut} />

                                <label>Item Purity (HUID/Karat/Carat):</label>
                                <input
                                    type="text"
                                    name="itemMetalPurity"
                                    value={formData.itemMetalPurity}
                                    onChange={handleInputChange}
                                    required={(isManualItemEntryForOut && (formData.metalType === 'gold' || formData.metalType === 'silver' || formData.metalType === 'others'))}
                                    readOnly={!isManualItemEntryForOut}
                                    // Client-side validation for HUID when metalType is gold and manual entry is active
                                    pattern={isManualItemEntryForOut && formData.metalType === 'gold' ? '[A-Za-z0-9]{6}' : undefined}
                                    title={isManualItemEntryForOut && formData.metalType === 'gold' ? 'Enter exactly 6 alphanumeric characters for HUID' : undefined}
                                />

                                <label>Customer Balance:</label>
                                <input type="text" name="customerBalance" value={formData.customerBalance} onChange={handleInputChange} />
                            </>
                        )}

                        <label>Remarks:</label>
                        <textarea name="remarks" value={formData.remarks} onChange={handleInputChange} />

                        <div className="modal-buttons">
                            <button onClick={handleUpdateSubmit}>Save Changes</button>
                            <button type="button" onClick={handleUpdateModalClose}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ───────────────────────────────────────────────────────────────────────── */}
            {/* F) Item Selection Modal (shown when showItemSelectionModal = true) */}
            {/* ───────────────────────────────────────────────────────────────────────── */}
            {showItemSelectionModal && (
                <div className="modal-overlay item-selection-modal">
                    <div className="modal-content">
                        <h3>Select Item for Customer Out</h3>
                        <input
                            type="text"
                            placeholder="Search items..."
                            className="search-bar"
                            value={itemSearchTerm}
                            onChange={(e) => setItemSearchTerm(e.target.value)}
                        />

                        <div className="item-list-section">
                            <h4>Currently Available Items</h4>
                            {filteredLiveItems.length > 0 ? (
                                <table className="item-selection-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Metal Type</th>
                                            <th>Subtype</th>
                                            <th>Gross Wt</th>
                                            <th>Net Wt</th>
                                            <th>Purity</th>
                                            <th>Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredLiveItems.map(item => (
                                            <tr key={item._id} onClick={() => handleItemSelect(item)}>
                                                <td>{item.jewelleryName}</td>
                                                <td>{item.metalType}</td>
                                                <td>{item.subtype}</td>
                                                <td>{item.grossWeight}</td>
                                                <td>{item.netWeight}</td>
                                                <td>{item.karatOrHUID}</td>
                                                <td>{item.balance}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p>No active items found matching your search.</p>
                            )}
                        </div>

                        <div className="item-list-section">
                            <h4>Previously Purchased/Deleted Items (Not Selectable)</h4>
                            {filteredDeletedItems.length > 0 ? (
                                <table className="item-selection-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Metal Type</th>
                                            <th>Subtype</th>
                                            <th>Gross Wt</th>
                                            <th>Net Wt</th>
                                            <th>Purity</th>
                                            <th>Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredDeletedItems.map(item => (
                                            <tr key={item._id} className="disabled-row">
                                                <td>{item.jewelleryName}</td>
                                                <td>{item.metalType}</td>
                                                <td>{item.subtype}</td>
                                                <td>{item.grossWeight}</td>
                                                <td>{item.netWeight}</td>
                                                <td>{item.karatOrHUID}</td>
                                                <td>{item.balance}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p>No deleted items found matching your search.</p>
                            )}
                        </div>
                        <div className="modal-buttons">
                            <button type="button" onClick={() => setShowItemSelectionModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CustomerForm;
