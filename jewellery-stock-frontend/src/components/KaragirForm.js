// src/components/KaragirForm.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './KaragirForm.css';  // Ensure your CSS can handle the slightly wider columns

function KaragirForm() {
  // ─── Local State ────────────────────────────────────────────────────────────
  const [actionType, setActionType] = useState('in');
  const [karagirList, setKaragirList] = useState([]);       // All entries for table
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showModal, setShowModal] = useState(false);        // Show update modal
  const [updateId, setUpdateId] = useState(null);           // _id of entry being updated

  // Form fields (for both “in” and “out”)
  const [formData, setFormData] = useState({
    metalType: '',
    purity: '',
    grams: '',
    ornamentName: '',
    labourCharge: '',
    karatOrHUID: '',
    grossWeight: '',
    netWeight: '',
    subtype: '',
    karagirName: '',
    status: '',
    remarks: ''
  });

  // ────────────────────────────────────────────────────────────────────────────────
  // Utility: always attach JWT (if any) when calling protected endpoints
  // ────────────────────────────────────────────────────────────────────────────────
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`
    };
  };

  // ────────────────────────────────────────────────────────────────────────────────
  // 1) handleInputChange: update formData. If user types karagirName in “in” mode,
  //    immediately check for any pending “out” entries with the same name.
  // ────────────────────────────────────────────────────────────────────────────────
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'karagirName' && actionType === 'in' && value.trim() !== '') {
      checkPendingOut(value.trim());
    }
  };

  // ────────────────────────────────────────────────────────────────────────────────
  // 2) checkPendingOut: GET /api/karagirleisures?actionType=out&status=pending&karagirName=…
  // ────────────────────────────────────────────────────────────────────────────────
  const checkPendingOut = async (karagirNameToCheck) => {
    try {
      const res = await axios.get(
        `/api/karagirleisures?actionType=out&status=pending&karagirName=${encodeURIComponent(karagirNameToCheck)}`,
        { headers: getAuthHeaders() }
      );
      if (Array.isArray(res.data) && res.data.length > 0) {
        toast.warn('This karagir has yet to give the ornament', {
          position: 'top-right',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true
        });
      }
    } catch (err) {
      console.error('Error checking pending out:', err);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────────
  // 3) handleSubmit: POST new Karagir entry.
  // ────────────────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      actionType,
      karagirName: formData.karagirName,
      metalType: formData.metalType,
      purity: formData.purity,
      remarks: formData.remarks || ''
    };

    if (actionType === 'out') {
      payload.grams = parseFloat(formData.grams) || 0;
      payload.status = 'pending';
    } else {
      payload.ornamentName = formData.ornamentName;
      payload.labourCharge = parseFloat(formData.labourCharge) || 0;
      payload.karatOrHUID = formData.karatOrHUID;
      payload.grossWeight = parseFloat(formData.grossWeight) || 0;
      payload.netWeight = parseFloat(formData.netWeight) || 0;
      payload.subtype = formData.subtype;
    }

    try {
      await axios.post('/api/karagirleisures', payload, { headers: getAuthHeaders() });
      toast.success('Karagir entry submitted', { autoClose: 2000 });
      fetchAllKaragirs();

      // Clear form fields
      setFormData({
        metalType: '',
        purity: '',
        grams: '',
        ornamentName: '',
        labourCharge: '',
        karatOrHUID: '',
        grossWeight: '',
        netWeight: '',
        subtype: '',
        karagirName: '',
        status: '',
        remarks: ''
      });
    } catch (err) {
      console.error('Error submitting Karagir entry:', err);
      const message = err.response?.data?.message || err.message;
      toast.error(`Submission failed: ${message}`, { autoClose: 3000 });
    }
  };

  // ────────────────────────────────────────────────────────────────────────────────
  // 4) fetchAllKaragirs: GET every Karagir document for this vendor
  // ────────────────────────────────────────────────────────────────────────────────
  const fetchAllKaragirs = async () => {
    try {
      const res = await axios.get('/api/karagirleisures', { headers: getAuthHeaders() });
      setKaragirList(res.data);
      setSelectedEntry(null);
    } catch (err) {
      console.error('Error fetching all Karagir entries:', err);
      toast.error('Failed to load Karagir entries', { autoClose: 2000 });
    }
  };

  // ────────────────────────────────────────────────────────────────────────────────
  // 5) handleGetById: Prompt for an _id, then GET /api/karagirleisures/:id
  // ────────────────────────────────────────────────────────────────────────────────
  const handleGetById = async () => {
    const id = prompt('Enter Karagir _id:');
    if (!id) return;
    try {
      const res = await axios.get(`/api/karagirleisures/${id}`, { headers: getAuthHeaders() });
      setKaragirList([res.data]);
      setSelectedEntry(res.data);
    } catch (err) {
      console.error('Error fetching Karagir by ID:', err);
      toast.error('Could not fetch entry. Check the ID.', { autoClose: 2000 });
    }
  };

  // ────────────────────────────────────────────────────────────────────────────────
  // 6) handleDeleteById: Prompt for an _id, then DELETE /api/karagirleisures/:id
  // ────────────────────────────────────────────────────────────────────────────────
  const handleDeleteById = async () => {
    const id = prompt('Enter Karagir _id to delete:');
    if (!id) return;
    try {
      await axios.delete(`/api/karagirleisures/${id}`, { headers: getAuthHeaders() });
      toast.success('Entry deleted', { autoClose: 2000 });
      fetchAllKaragirs();
    } catch (err) {
      console.error('Error deleting Karagir by ID:', err);
      toast.error('Delete failed. Check the ID.', { autoClose: 2000 });
    }
  };

  // ────────────────────────────────────────────────────────────────────────────────
  // 7) handleDeleteAll: DELETE /api/karagirleisures (all entries for this vendor)
  // ────────────────────────────────────────────────────────────────────────────────
  const handleDeleteAll = async () => {
    if (!window.confirm('Are you sure you want to delete ALL Karagir entries?')) return;
    try {
      await axios.delete('/api/karagirleisures', { headers: getAuthHeaders() });
      toast.success('All entries deleted', { autoClose: 2000 });
      setKaragirList([]);
      setSelectedEntry(null);
    } catch (err) {
      console.error('Error deleting all Karagir entries:', err);
      toast.error('Failed to delete all entries', { autoClose: 2000 });
    }
  };

  // ────────────────────────────────────────────────────────────────────────────────
  // 8) handleUpdateById: Prompt for _id, GET its data, pre‐fill form, show modal
  // ────────────────────────────────────────────────────────────────────────────────
  const handleUpdateById = async () => {
    const id = prompt('Enter Karagir _id to update:');
    if (!id) return;
    try {
      const res = await axios.get(`/api/karagirleisures/${id}`, { headers: getAuthHeaders() });
      const data = res.data;

      // Pre-fill formData with fetched data
      setFormData({
        metalType: data.metalType || '',
        purity: data.purity || '',
        grams: data.grams ?? '',
        ornamentName: data.ornamentName || '',
        labourCharge: data.labourCharge ?? '',
        karatOrHUID: data.karatOrHUID || '',
        grossWeight: data.grossWeight ?? '',
        netWeight: data.netWeight ?? '',
        subtype: data.subtype || '',
        karagirName: data.karagirName || '',
        status: data.status || '',
        remarks: data.remarks || ''
      });
      setUpdateId(data._id);
      setActionType(data.actionType);
      setShowModal(true);
    } catch (err) {
      console.error('Error loading Karagir entry for update:', err);
      toast.error('Failed to load entry. Check the ID.', { autoClose: 2000 });
    }
  };

  // ────────────────────────────────────────────────────────────────────────────────
  // 9) handleUpdateSubmit: PUT /api/karagirleisures/:updateId
  // ────────────────────────────────────────────────────────────────────────────────
  const handleUpdateSubmit = async () => {
    if (!updateId) return;
    const payload = {
      actionType,
      karagirName: formData.karagirName,
      metalType: formData.metalType,
      purity: formData.purity,
      remarks: formData.remarks || ''
    };

    if (actionType === 'out') {
      payload.grams = parseFloat(formData.grams) || 0;
      payload.status = formData.status || 'pending';
    } else {
      payload.ornamentName = formData.ornamentName;
      payload.labourCharge = parseFloat(formData.labourCharge) || 0;
      payload.karatOrHUID = formData.karatOrHUID;
      payload.grossWeight = parseFloat(formData.grossWeight) || 0;
      payload.netWeight = parseFloat(formData.netWeight) || 0;
      payload.subtype = formData.subtype;
    }

    try {
      await axios.put(`/api/karagirleisures/${updateId}`, payload, { headers: getAuthHeaders() });
      toast.success('Entry updated', { autoClose: 2000 });
      setShowModal(false);
      setUpdateId(null);
      fetchAllKaragirs();
    } catch (err) {
      console.error('Error updating Karagir entry:', err);
      const message = err.response?.data?.message || err.message;
      toast.error(`Update failed: ${message}`, { autoClose: 2000 });
    }
  };

  // ────────────────────────────────────────────────────────────────────────────────
  // 10) On first mount, fetch all entries for this vendor
  // ────────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchAllKaragirs();
    // eslint-disable-next-line
  }, []);

  // ────────────────────────────────────────────────────────────────────────────────
  // 11) handleModalClose: close the update modal
  // ────────────────────────────────────────────────────────────────────────────────
  const handleModalClose = () => {
    setShowModal(false);
    setUpdateId(null);
  };

  // ────────────────────────────────────────────────────────────────────────────────
  // Render begins here
  // ────────────────────────────────────────────────────────────────────────────────
  return (
    <div className="karagir-manager-container">
      {/* Toast container for pop‐up messages */}
      <ToastContainer />

      <h3>Karagir In-Out</h3>

      {/* ───────────────────────────────────────────────────────────────────────── */} 
      {/* A) Form Section: Action dropdown + fields + “Submit Karagir Entry”   */} 
      {/* ───────────────────────────────────────────────────────────────────────── */} 
      <div className="karagir-action-form">
        <label>
          Action:
          <select
            value={actionType}
            onChange={(e) => {
              setActionType(e.target.value);
              // Clear form fields when action toggles
              setFormData({
                metalType: '',
                purity: '',
                grams: '',
                ornamentName: '',
                labourCharge: '',
                karatOrHUID: '',
                grossWeight: '',
                netWeight: '',
                subtype: '',
                karagirName: '',
                status: '',
                remarks: ''
              });
            }}
          >
            <option value="in">In</option>
            <option value="out">Out</option>
          </select>
        </label>

        {/* ── Common fields for both “in” & “out” ─────────────────────────────────── */}
        <div className="karagir-common-fields">
          <input
            type="text"
            name="karagirName"
            placeholder="Karagir Name"
            value={formData.karagirName}
            onChange={handleInputChange}
            required
          />
          <input
            type="text"
            name="metalType"
            placeholder="Metal Type (gold / silver)"
            value={formData.metalType}
            onChange={handleInputChange}
            required
          />
          <input
            type="text"
            name="purity"
            placeholder="Purity"
            value={formData.purity}
            onChange={handleInputChange}
            required
          />
          <input
            type="text"
            name="remarks"
            placeholder="Remarks"
            value={formData.remarks}
            onChange={handleInputChange}
          />
        </div>

        {/* ── Fields only shown when actionType === 'in' ────────────────────────── */}
        {actionType === 'in' && (
          <div className="karagir-in-fields">
            <input
              type="text"
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
              value={formData.labourCharge}
              onChange={handleInputChange}
              required
            />
            <input
              type="text"
              name="karatOrHUID"
              placeholder="Karat / HUID"
              value={formData.karatOrHUID}
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
              name="subtype"
              placeholder="Subtype"
              value={formData.subtype}
              onChange={handleInputChange}
              required
            />
          </div>
        )}

        {/* ── Fields only shown when actionType === 'out' ───────────────────────── */}
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
            {/* Status is auto-pending; no input here */}
          </div>
        )}

        {/* Submit button */}
        <button className="karagir-submit-button" onClick={handleSubmit}>
          Submit Karagir Entry
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────── */} 
      {/* B) Control Buttons: GET ALL, GET BY ID, DELETE ALL, DELETE BY ID, UPDATE  */} 
      {/* ───────────────────────────────────────────────────────────────────────── */} 
      <div className="karagir-control-buttons">
        <button onClick={fetchAllKaragirs}>GET ALL KARAGIRS</button>
        <button onClick={handleGetById}>GET KARAGIR BY ID</button>
        <button onClick={handleDeleteAll}>DELETE ALL KARAGIRS</button>
        <button onClick={handleDeleteById}>DELETE KARAGIR BY ID</button>
        <button onClick={handleUpdateById}>UPDATE KARAGIR BY ID</button>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────── */} 
      {/* C) Karagir Entries Table (with new columns showing “Not Applied” for Out)  */} 
      {/* ───────────────────────────────────────────────────────────────────────── */} 
      {Array.isArray(karagirList) && karagirList.length > 0 && (
        <table className="karagir-table">
          <thead>
            <tr>
              <th>_id</th>
              <th>Karagir Name</th>
              <th>Action</th>
              <th>Metal Type</th>
              <th>Purity</th>
              <th>Grams (for Out) / Ornament (for In)</th>
              <th>Labour Charge</th>
              <th>Karat / HUID</th>
              <th>Gross Weight</th>
              <th>Net Weight</th>
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
                <td>{entry.metalType}</td>
                <td>{entry.purity}</td>
                <td>
                  {entry.actionType === 'out'
                    ? entry.grams
                    : entry.ornamentName}
                </td>

                {/* ─── New columns ────────────────────────────────────────────────── */}
                <td>
                  {entry.actionType === 'in'
                    ? entry.labourCharge
                    : 'Not Applied'}
                </td>
                <td>
                  {entry.actionType === 'in'
                    ? entry.karatOrHUID
                    : 'Not Applied'}
                </td>
                <td>
                  {entry.actionType === 'in'
                    ? entry.grossWeight
                    : 'Not Applied'}
                </td>
                <td>
                  {entry.actionType === 'in'
                    ? entry.netWeight
                    : 'Not Applied'}
                </td>
                <td>
                  {entry.actionType === 'in'
                    ? entry.subtype
                    : 'Not Applied'}
                </td>
                {/* ──────────────────────────────────────────────────────────────────── */}

                <td className="remarks-col">{entry.remarks}</td>
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

      {/* ───────────────────────────────────────────────────────────────────────── */} 
      {/* D) Update Modal (shown when showModal = true)                           */} 
      {/* ───────────────────────────────────────────────────────────────────────── */} 
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Update Karagir Entry: {updateId}</h3>

            <label>Action:</label>
            <select
              value={actionType}
              onChange={(e) => {
                setActionType(e.target.value);
                // Clear form fields if toggling
                setFormData({
                  metalType: '',
                  purity: '',
                  grams: '',
                  ornamentName: '',
                  labourCharge: '',
                  karatOrHUID: '',
                  grossWeight: '',
                  netWeight: '',
                  subtype: '',
                  karagirName: '',
                  status: '',
                  remarks: ''
                });
              }}
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
            />

            <label>Metal Type:</label>
            <input
              type="text"
              name="metalType"
              value={formData.metalType}
              onChange={handleInputChange}
            />

            <label>Purity:</label>
            <input
              type="text"
              name="purity"
              value={formData.purity}
              onChange={handleInputChange}
            />

            {actionType === 'out' && (
              <>
                <label>Grams:</label>
                <input
                  type="number"
                  name="grams"
                  step="0.01"
                  value={formData.grams}
                  onChange={handleInputChange}
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
                />

                <label>Labour Charge:</label>
                <input
                  type="number"
                  name="labourCharge"
                  step="0.01"
                  value={formData.labourCharge}
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

                <label>Subtype:</label>
                <input
                  type="text"
                  name="subtype"
                  value={formData.subtype}
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

export default KaragirForm;
