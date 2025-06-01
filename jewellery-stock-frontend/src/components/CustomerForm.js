import React, { useState } from 'react';
import axios from 'axios';

function CustomerForm() {
  const [customerAction, setCustomerAction] = useState('in');
  const [paymentForm, setPaymentForm] = useState('');
  const [formData, setFormData] = useState({
    customerName: '', customerAddress: '', customerContact: '',
    metalType: '', paymentForm: '', purity: '',
    gramsGiven: '', equivalentAmount: '', cashAmount: '',
    jewelleryName: '', subtype: '', grossWeight: '',
    netWeight: '', metalPurity: '', remarks: ''
  });
  const vendor = JSON.parse(localStorage.getItem('vendor')) || {};

  const handleSubmit = (e) => {
    e.preventDefault();
    axios.post('/api/customer', { actionType: customerAction, ...formData, vendorId: vendor.id })
      .then(res => alert('Customer entry submitted'))
      .catch(err => console.error(err));
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Customer In-Out</h3>
      <label>
        Action:
        <select value={customerAction} onChange={e => setCustomerAction(e.target.value)}>
          <option value="in">In</option>
          <option value="out">Out</option>
        </select>
      </label>

      {/* Fields for Customer "in" */}
      {customerAction === 'in' && (
        <div>
          <input type="text" placeholder="Customer Name"
            value={formData.customerName}
            onChange={e => setFormData({ ...formData, customerName: e.target.value })}
          />
          <input type="text" placeholder="Address"
            value={formData.customerAddress}
            onChange={e => setFormData({ ...formData, customerAddress: e.target.value })}
          />
          <input type="text" placeholder="Contact"
            value={formData.customerContact}
            onChange={e => setFormData({ ...formData, customerContact: e.target.value })}
          />
          <input type="text" placeholder="Metal Type"
            value={formData.metalType}
            onChange={e => setFormData({ ...formData, metalType: e.target.value })}
          />
          <label>
            Payment Form:
            <select
              value={paymentForm}
              onChange={e => {
                setPaymentForm(e.target.value);
                setFormData({ ...formData, paymentForm: e.target.value });
              }}
            >
              <option value="">Select</option>
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
            </select>
          </label>
          {/* If gold/silver, show purity, gramsGiven, equivalentAmount */}
          {(paymentForm === 'gold' || paymentForm === 'silver') && (
            <>
              <input type="number" placeholder="Purity"
                value={formData.purity}
                onChange={e => setFormData({ ...formData, purity: e.target.value })}
              />
              <input type="number" placeholder="Grams Given"
                value={formData.gramsGiven}
                onChange={e => setFormData({ ...formData, gramsGiven: e.target.value })}
              />
              <input type="number" placeholder="Equivalent Amount"
                value={formData.equivalentAmount}
                onChange={e => setFormData({ ...formData, equivalentAmount: e.target.value })}
              />
            </>
          )}
          {/* If cash/cheque, show cashAmount */}
          {(paymentForm === 'cash' || paymentForm === 'cheque') && (
            <input type="number" placeholder="Cash Amount"
              value={formData.cashAmount}
              onChange={e => setFormData({ ...formData, cashAmount: e.target.value })}
            />
          )}
          <input type="text" placeholder="Remarks"
            value={formData.remarks}
            onChange={e => setFormData({ ...formData, remarks: e.target.value })}
          />
        </div>
      )}

      {/* Fields for Customer "out" */}
      {customerAction === 'out' && (
        <div>
          <input type="text" placeholder="Customer Name"
            value={formData.customerName}
            onChange={e => setFormData({ ...formData, customerName: e.target.value })}
          />
          <input type="text" placeholder="Address"
            value={formData.customerAddress}
            onChange={e => setFormData({ ...formData, customerAddress: e.target.value })}
          />
          <input type="text" placeholder="Contact"
            value={formData.customerContact}
            onChange={e => setFormData({ ...formData, customerContact: e.target.value })}
          />
          <input type="text" placeholder="Jewellery Name"
            value={formData.jewelleryName}
            onChange={e => setFormData({ ...formData, jewelleryName: e.target.value })}
          />
          <input type="text" placeholder="Subtype"
            value={formData.subtype}
            onChange={e => setFormData({ ...formData, subtype: e.target.value })}
          />
          <input type="number" placeholder="Gross Weight"
            value={formData.grossWeight}
            onChange={e => setFormData({ ...formData, grossWeight: e.target.value })}
          />
          <input type="number" placeholder="Net Weight"
            value={formData.netWeight}
            onChange={e => setFormData({ ...formData, netWeight: e.target.value })}
          />
          <input type="number" placeholder="Metal Purity"
            value={formData.metalPurity}
            onChange={e => setFormData({ ...formData, metalPurity: e.target.value })}
          />
          <input type="text" placeholder="Remarks"
            value={formData.remarks}
            onChange={e => setFormData({ ...formData, remarks: e.target.value })}
          />
        </div>
      )}

      <button type="submit">Submit Customer Entry</button>
    </form>
  );
}

export default CustomerForm;
