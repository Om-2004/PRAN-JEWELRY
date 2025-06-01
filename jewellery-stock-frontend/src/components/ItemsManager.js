import React, { useState } from 'react';
import axios from 'axios';

function ItemsManager() {
  const [items, setItems] = useState([]);         // all items list
  const [itemId, setItemId] = useState('');       // ID for single-item queries
  const [itemDetails, setItemDetails] = useState(null); // single item details
  const [updateId, setUpdateId] = useState('');   // ID to update
  const [updateData, setUpdateData] = useState({ itemName: '', metalType: '', weight: '' });
  const vendor = JSON.parse(localStorage.getItem('vendor')) || {};

  // GET all items for this vendor
  const getAllItems = () => {
    axios.get(`/api/items?vendorId=${vendor.id}`)
      .then(res => setItems(res.data))
      .catch(err => console.error(err));
  };

  // GET item by ID
  const getItemById = () => {
    if (!itemId) return;
    axios.get(`/api/items/${itemId}?vendorId=${vendor.id}`)
      .then(res => setItemDetails(res.data))
      .catch(err => console.error(err));
  };

  // DELETE item by ID
  const deleteItem = () => {
    if (!itemId) return;
    axios.delete(`/api/items/${itemId}?vendorId=${vendor.id}`)
      .then(() => {
        alert('Item deleted');
        setItemDetails(null);
      })
      .catch(err => console.error(err));
  };

  // UPDATE item by ID with form data
  const updateItem = () => {
    if (!updateId) return;
    axios.put(`/api/items/${updateId}?vendorId=${vendor.id}`, updateData)
      .then(() => {
        alert('Item updated');
        // Optionally refresh list or clear form
      })
      .catch(err => console.error(err));
  };

  return (
    <div>
      <h3>Items Management</h3>
      {/* Button to fetch all items */}
      <button onClick={getAllItems}>GET ALL ITEMS</button>
      <ul>
        {items.map(item => (
          <li key={item.id}>{item.itemName} (ID: {item.id})</li>
        ))}
      </ul>

      {/* Form to GET or DELETE by ID */}
      <div>
        <input
          type="text" placeholder="Item ID"
          value={itemId} onChange={e => setItemId(e.target.value)}
        />
        <button onClick={getItemById}>GET ITEM BY ID</button>
        <button onClick={deleteItem}>DELETE ITEM BY ID</button>
      </div>
      {itemDetails && (
        <div>
          <h4>Item Details:</h4>
          <pre>{JSON.stringify(itemDetails, null, 2)}</pre>
        </div>
      )}

      {/* Form to UPDATE item by ID */}
      <div>
        <input
          type="text" placeholder="Update Item ID"
          value={updateId} onChange={e => setUpdateId(e.target.value)}
        />
        <input
          type="text" name="itemName" placeholder="New Name"
          value={updateData.itemName}
          onChange={e => setUpdateData({ ...updateData, itemName: e.target.value })}
        />
        <input
          type="text" name="metalType" placeholder="New Metal"
          value={updateData.metalType}
          onChange={e => setUpdateData({ ...updateData, metalType: e.target.value })}
        />
        <input
          type="number" name="weight" placeholder="New Weight"
          value={updateData.weight}
          onChange={e => setUpdateData({ ...updateData, weight: e.target.value })}
        />
        <button onClick={updateItem}>UPDATE EXISTING ENTRY</button>
      </div>
    </div>
  );
}

export default ItemsManager;
