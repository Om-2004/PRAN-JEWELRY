// src/components/CustomerForm.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './CustomerForm.css';

function CustomerForm() {
  // ─── Local State ────────────────────────────────────────────────────────────
  const [actionType, setActionType] = useState('in');
  const [customerList, setCustomerList] = useState([]);
  const [itemOptions, setItemOptions] = useState([]);           // <-- for live items
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [updateId, setUpdateId] = useState(null);

  const [formData, setFormData] = useState({
    customerName: '',
    customerAddress: '',
    customerContact: '',
    metalType: '',
    paymentForm: '',
    purity: '',
    grams_given: '',
    equivalentAmount: '',
    cashAmount: '',
    jewelleryName: '',
    subtype: '',
    grossWeight: '',
    netWeight: '',
    metalPurity: '',
    remarks: ''
  });

  // ────────────────────────────────────────────────────────────────────────────────
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  // ────────────────────────────────────────────────────────────────────────────────
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ────────────────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        '/api/customers',
        { actionType, ...formData },
        { headers: getAuthHeaders() }
      );
      toast.success('Customer entry submitted', { autoClose: 2000 });
      fetchAllCustomers();
      setFormData({
        customerName: '',
        customerAddress: '',
        customerContact: '',
        metalType: '',
        paymentForm: '',
        purity: '',
        grams_given: '',
        equivalentAmount: '',
        cashAmount: '',
        jewelleryName: '',
        subtype: '',
        grossWeight: '',
        netWeight: '',
        metalPurity: '',
        remarks: ''
      });
      setActionType('in');
    } catch (err) {
      console.error('Error submitting Customer entry:', err);
      const msg = err.response?.data?.message || err.message;
      toast.error(`Submission failed: ${msg}`, { autoClose: 3000 });
    }
  };

  // ────────────────────────────────────────────────────────────────────────────────
  const fetchAllCustomers = async () => {
    try {
      const res = await axios.get('/api/customers', { headers: getAuthHeaders() });
      setCustomerList(res.data);
      setSelectedEntry(null);
    } catch (err) {
      console.error('Error fetching all customers:', err);
      toast.error('Failed to load Customer entries', { autoClose: 2000 });
    }
  };

  // ────────────────────────────────────────────────────────────────────────────────
  // Fetch live items only when actionType === 'out'
  const fetchItems = async () => {
    try {
      const res = await axios.get('/api/items', { headers: getAuthHeaders() });
      setItemOptions(res.data);
    } catch (err) {
      console.error('Error fetching items for datalist:', err);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────────
  // Whenever we switch to “out” mode, reload current items
  useEffect(() => {
    if (actionType === 'out') {
      fetchItems();
    }
  }, [actionType]);

  // ────────────────────────────────────────────────────────────────────────────────
  const handleGetById = async () => {
    const id = prompt('Enter Customer transaction _id:');
    if (!id) return;
    try {
      const res = await axios.get(`/api/customers/${id}`, { headers: getAuthHeaders() });
      setCustomerList([res.data]);
      setSelectedEntry(res.data);
    } catch (err) {
      console.error('Error fetching Customer by ID:', err);
      toast.error('Could not fetch entry. Check the ID.', { autoClose: 2000 });
    }
  };

  // ────────────────────────────────────────────────────────────────────────────────
  const handleDeleteById = async () => {
    const id = prompt('Enter Customer _id to delete:');
    if (!id) return;
    try {
      await axios.delete(`/api/customers/${id}`, { headers: getAuthHeaders() });
      toast.success('Entry deleted', { autoClose: 2000 });
      fetchAllCustomers();
    } catch (err) {
      console.error('Error deleting Customer by ID:', err);
      toast.error('Delete failed. Check the ID.', { autoClose: 2000 });
    }
  };

  // ────────────────────────────────────────────────────────────────────────────────
  const handleDeleteAll = async () => {
    if (!window.confirm('Delete ALL Customer entries?')) return;
    try {
      await axios.delete('/api/customers', { headers: getAuthHeaders() });
      toast.success('All entries deleted', { autoClose: 2000 });
      setCustomerList([]);
      setSelectedEntry(null);
    } catch (err) {
      console.error('Error deleting all Customer entries:', err);
      toast.error('Failed to delete all entries', { autoClose: 2000 });
    }
  };

  // ────────────────────────────────────────────────────────────────────────────────
  const handleUpdateById = async () => {
    const id = prompt('Enter Customer _id to update:');
    if (!id) return;
    try {
      const res = await axios.get(`/api/customers/${id}`, { headers: getAuthHeaders() });
      const data = res.data;
      setFormData({
        customerName: data.customerName || '',
        customerAddress: data.customerAddress || '',
        customerContact: data.customerContact || '',
        metalType: data.metalType || '',
        paymentForm: data.paymentForm || '',
        purity: data.purity ?? '',
        grams_given: data.grams_given ?? '',
        equivalentAmount: data.equivalentAmount ?? '',
        cashAmount: data.cashAmount ?? '',
        jewelleryName: data.jewelleryName || '',
        subtype: data.subtype || '',
        grossWeight: data.grossWeight ?? '',
        netWeight: data.netWeight ?? '',
        metalPurity: data.metalPurity || '',
        remarks: data.remarks || ''
      });
      setUpdateId(data._id);
      setActionType(data.actionType);
      setShowModal(true);
    } catch (err) {
      console.error('Error loading Customer for update:', err);
      toast.error('Failed to load entry. Check the ID.', { autoClose: 2000 });
    }
  };

  // ────────────────────────────────────────────────────────────────────────────────
  const handleUpdateSubmit = async () => {
    if (!updateId) return;
    const payload = {
      actionType,
      customerName: formData.customerName,
      customerAddress: formData.customerAddress,
      customerContact: formData.customerContact,
      metalType: formData.metalType,
      paymentForm: formData.paymentForm,
      purity: formData.purity,
      grams_given: formData.grams_given,
      equivalentAmount: formData.equivalentAmount,
      cashAmount: formData.cashAmount,
      jewelleryName: formData.jewelleryName,
      subtype: formData.subtype,
      grossWeight: formData.grossWeight,
      netWeight: formData.netWeight,
      metalPurity: formData.metalPurity,
      remarks: formData.remarks
    };
    try {
      await axios.put(
        `/api/customers/${updateId}`,
        payload,
        { headers: getAuthHeaders() }
      );
      toast.success('Entry updated', { autoClose: 2000 });
      setShowModal(false);
      setUpdateId(null);
      fetchAllCustomers();
    } catch (err) {
      console.error('Error updating Customer entry:', err);
      const msg = err.response?.data?.message || err.message;
      toast.error(`Update failed: ${msg}`, { autoClose: 2000 });
    }
  };

  // ────────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchAllCustomers();
    // eslint-disable-next-line
  }, []);

  // ────────────────────────────────────────────────────────────────────────────────
  const handleModalClose = () => {
    setShowModal(false);
    setUpdateId(null);
  };

  // ────────────────────────────────────────────────────────────────────────────────
  return (
    <div className="customer-manager-container">
      <ToastContainer />

      <h3>Customer In-Out</h3>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* A) Form Section: Action dropdown + fields + “Submit Customer Entry” */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <div className="customer-action-form">
        <label>
          Action:
          <select
            value={actionType}
            onChange={(e) => {
              setActionType(e.target.value);
              setFormData({
                customerName: '',
                customerAddress: '',
                customerContact: '',
                metalType: '',
                paymentForm: '',
                purity: '',
                grams_given: '',
                equivalentAmount: '',
                cashAmount: '',
                jewelleryName: '',
                subtype: '',
                grossWeight: '',
                netWeight: '',
                metalPurity: '',
                remarks: ''
              });
            }}
          >
            <option value="in">In</option>
            <option value="out">Out</option>
          </select>
        </label>

        {/* ── Common fields ─────────────────────────────────────────────────────── */}
        <div className="customer-common-fields">
          <input
            type="text"
            name="customerName"
            placeholder="Customer Name"
            value={formData.customerName}
            onChange={handleInputChange}
            required
          />
          <input
            type="text"
            name="customerAddress"
            placeholder="Address"
            value={formData.customerAddress}
            onChange={handleInputChange}
            required
          />
          <input
            type="text"
            name="customerContact"
            placeholder="Contact"
            value={formData.customerContact}
            onChange={handleInputChange}
            required
          />
          <input
            type="text"
            name="metalType"
            placeholder="Metal Type"
            value={formData.metalType}
            onChange={handleInputChange}
            required
          />
        </div>

        {/* ── Payment Form */}
        <label>
          Payment Form:
          <select
            name="paymentForm"
            value={formData.paymentForm}
            onChange={handleInputChange}
            required
          >
            <option value="">Select</option>
            <option value="gold">Gold</option>
            <option value="silver">Silver</option>
            <option value="cash">Cash</option>
            <option value="cheque">Cheque</option>
          </select>
        </label>

        {/* ── If gold/silver, show purity/grams/equivalentAmount */}
        {(formData.paymentForm === 'gold' || formData.paymentForm === 'silver') && (
          <div className="customer-metal-payment-fields">
            <input
              type="number"
              name="purity"
              placeholder="Purity"
              value={formData.purity}
              onChange={handleInputChange}
              required
            />
            <input
              type="number"
              name="grams_given"
              placeholder="Grams Given"
              value={formData.grams_given}
              onChange={handleInputChange}
              required
            />
            <input
              type="number"
              name="equivalentAmount"
              placeholder="Equivalent Amount"
              value={formData.equivalentAmount}
              onChange={handleInputChange}
              required
            />
          </div>
        )}

        {/* ── If cash/cheque, show cashAmount */}
        {(formData.paymentForm === 'cash' || formData.paymentForm === 'cheque') && (
          <input
            type="number"
            name="cashAmount"
            placeholder="Cash Amount"
            value={formData.cashAmount}
            onChange={handleInputChange}
            required
          />
        )}

        {/* ── Additional fields for Customer-Out */}
        {actionType === 'out' && (
          <div className="customer-out-fields">
            {/* ← Changed to use <datalist> for live item names */}
            <label>Jewellery Name:</label>
            <input
              type="text"
              name="jewelleryName"
              placeholder="Jewellery Name"
              list="items-list"
              value={formData.jewelleryName}
              onChange={handleInputChange}
              required
            />
            <datalist id="items-list">
              {itemOptions.map((item) => (
                <option key={item._id} value={item.jewelleryName} />
              ))}
            </datalist>

            <input
              type="text"
              name="subtype"
              placeholder="Subtype"
              value={formData.subtype}
              onChange={handleInputChange}
              required
            />
            <input
              type="number"
              name="grossWeight"
              placeholder="Gross Weight"
              step="0.01"
              value={formData.grossWeight}
              onChange={handleInputChange}
              required
            />
            <input
              type="number"
              name="netWeight"
              placeholder="Net Weight"
              step="0.01"
              value={formData.netWeight}
              onChange={handleInputChange}
              required
            />
            <input
              type="text"
              name="metalPurity"
              placeholder="Metal Purity"
              value={formData.metalPurity}
              onChange={handleInputChange}
              required
            />
          </div>
        )}

        {/* Remarks always visible */}
        <input
          type="text"
          name="remarks"
          placeholder="Remarks"
          value={formData.remarks}
          onChange={handleInputChange}
        />

        {/* Submit button */}
        <button className="customer-submit-button" onClick={handleSubmit}>
          Submit Customer Entry
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* B) Control Buttons: GET ALL, GET BY ID, DELETE ALL, DELETE BY ID, UPDATE  */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <div className="customer-control-buttons">
        <button onClick={fetchAllCustomers}>GET ALL CUSTOMERS</button>
        <button onClick={handleGetById}>GET CUSTOMER BY ID</button>
        <button onClick={handleDeleteAll}>DELETE ALL CUSTOMERS</button>
        <button onClick={handleDeleteById}>DELETE CUSTOMER BY ID</button>
        <button onClick={handleUpdateById}>UPDATE CUSTOMER BY ID</button>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* C) Customer Entries Table                                                   */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {Array.isArray(customerList) && customerList.length > 0 && (
        <table className="customer-table">
          <thead>
            <tr>
              <th>_id</th>
              <th>Action</th>
              <th>Customer Name</th>
              <th>Address</th>
              <th>Contact</th>
              <th>Metal</th>
              <th>Payment Form</th>
              <th>Purity</th>
              <th>Grams</th>
              <th>Equivalent</th>
              <th>Cash Amount</th>
              <th>Jewellery</th>
              <th>Subtype</th>
              <th>Gross Wt</th>
              <th>Net Wt</th>
              <th>Metal Purity</th>
              <th className="remarks-col">Remarks</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody>
            {customerList.map((entry) => (
              <tr key={entry._id}>
                <td>{entry._id}</td>
                <td>
                  <span
                    className={
                      entry.actionType === 'out'
                        ? 'badge badge-warning'
                        : 'badge badge-info'
                    }
                  >
                    {entry.actionType.toUpperCase()}
                  </span>
                </td>
                <td>{entry.customerName}</td>
                <td>{entry.customerAddress}</td>
                <td>{entry.customerContact}</td>
                <td>{entry.metalType}</td>
                <td>{entry.paymentForm}</td>
                <td>{entry.purity || '—'}</td>
                <td>{entry.grams_given || '—'}</td>
                <td>{entry.equivalentAmount || '—'}</td>
                <td>{entry.cashAmount || '—'}</td>
                <td>{entry.jewelleryName || '—'}</td>
                <td>{entry.subtype || '—'}</td>
                <td>{entry.grossWeight || '—'}</td>
                <td>{entry.netWeight || '—'}</td>
                <td>{entry.metalPurity || '—'}</td>
                <td className="remarks-col">{entry.remarks}</td>
                <td>{new Date(entry.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* D) Update Modal (shown when showModal = true)                             */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Update Customer Entry: {updateId}</h3>

            <label>Action:</label>
            <select
              value={actionType}
              onChange={(e) => {
                setActionType(e.target.value);
                setFormData({
                  customerName: '',
                  customerAddress: '',
                  customerContact: '',
                  metalType: '',
                  paymentForm: '',
                  purity: '',
                  grams_given: '',
                  equivalentAmount: '',
                  cashAmount: '',
                  jewelleryName: '',
                  subtype: '',
                  grossWeight: '',
                  netWeight: '',
                  metalPurity: '',
                  remarks: ''
                });
              }}
            >
              <option value="in">In</option>
              <option value="out">Out</option>
            </select>

            <label>Customer Name:</label>
            <input
              type="text"
              name="customerName"
              value={formData.customerName}
              onChange={handleInputChange}
            />

            <label>Address:</label>
            <input
              type="text"
              name="customerAddress"
              value={formData.customerAddress}
              onChange={handleInputChange}
            />

            <label>Contact:</label>
            <input
              type="text"
              name="customerContact"
              value={formData.customerContact}
              onChange={handleInputChange}
            />

            <label>Metal Type:</label>
            <input
              type="text"
              name="metalType"
              value={formData.metalType}
              onChange={handleInputChange}
            />

            <label>Payment Form:</label>
            <select
              name="paymentForm"
              value={formData.paymentForm}
              onChange={handleInputChange}
            >
              <option value="">Select</option>
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
            </select>

            {(formData.paymentForm === 'gold' || formData.paymentForm === 'silver') && (
              <>
                <label>Purity:</label>
                <input
                  type="number"
                  name="purity"
                  step="0.01"
                  value={formData.purity}
                  onChange={handleInputChange}
                />

                <label>Grams Given:</label>
                <input
                  type="number"
                  name="grams_given"
                  step="0.01"
                  value={formData.grams_given}
                  onChange={handleInputChange}
                />

                <label>Equivalent Amount:</label>
                <input
                  type="number"
                  name="equivalentAmount"
                  step="0.01"
                  value={formData.equivalentAmount}
                  onChange={handleInputChange}
                />
              </>
            )}

            {(formData.paymentForm === 'cash' || formData.paymentForm === 'cheque') && (
              <>
                <label>Cash Amount:</label>
                <input
                  type="number"
                  name="cashAmount"
                  step="0.01"
                  value={formData.cashAmount}
                  onChange={handleInputChange}
                />
              </>
            )}

            {actionType === 'out' && (
              <>
                <label>Jewellery Name:</label>
                <input
                  type="text"
                  name="jewelleryName"
                  value={formData.jewelleryName}
                  onChange={handleInputChange}
                  list="items-list"
                />
                <datalist id="items-list">
                  {itemOptions.map(item => (
                    <option key={item._id} value={item.jewelleryName} />
                  ))}
                </datalist>

                <label>Subtype:</label>
                <input
                  type="text"
                  name="subtype"
                  value={formData.subtype}
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

                <label>Metal Purity:</label>
                <input
                  type="text"
                  name="metalPurity"
                  value={formData.metalPurity}
                  onChange={handleInputChange}
                />
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

export default CustomerForm;
