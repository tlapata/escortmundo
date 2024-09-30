// controller is up to date
import bcrypt from 'bcrypt';
import { validationResult } from 'express-validator';
import CreateImageUrl from '../utils/createImageUrl.js';
import GetImagePath from '../utils/getImagePath.js';
import fs from 'fs';
// Connect to the database
import pool from '../db/db.js';


// Getting current user information
export const GetUser = async(req, res) => {

  const { userId } = req.decoded;

  try {
      const user = await pool.query(
        `SELECT *  
          FROM users 
          WHERE id = $1 AND activated = TRUE`,
        [userId]
      );

      //console.log("user data:", user.rows[0]);

      res.status(200).json({
          message: 'Fetched user successfully.',
          user: user.rows[0]
      });
      
  } catch (error) {
      console.error(error.message);
      res.status(400).send({ error: error })
  }
};



// Getting address of the user = mv8
export const GetAddresses = (req, res) => {
  
  const { userId } = req.decoded;

  collection.findOne({ _id: ObjectId.createFromHexString(userId) })
    .then((results) =>
      res.status(200).json({
        message: 'Fetched User successfully.',
        addresses: results.addresses,
        firstName: results.firstName,
        lastName: results.lastName,
      })
    )
    .catch((error) => res.status(400).send({ error: error }));
};

// Updating all user data = mv8
export const UpdateAccount = async (req, res) => {

  if (Object.keys(req.body).length <= 0 && req.file === undefined) {
    return res
      .status(422)
      .json({ error: 'Kindly, Provide an attribute to update.' });
  }

  const { userId } = req.decoded;
  const {
    firstName,
    lastName,
    username,
    email,
    gender,
    phone,
    addresses,
    dob,
    walletAddress,
  } = req.body;

  const data = {};
  if (firstName) {
    data['firstName'] = firstName;
  }
  if (lastName) {
    data['lastName'] = lastName;
  }
  if (username) {
    data['username'] = username;
  }
  if (email) {
    const ownEmail = await collection.findOne({_id: ObjectId.createFromHexString(userId)});
    let isOwnEmail = email === ownEmail.email;
    const isEmailExist = await collection.findOne({ email });
    if (isEmailExist && !isOwnEmail) {
      return res.status(400).json({ error: 'Email already exist.' });
    }
    data['email'] = email;
  }
  if (gender) {
    data['gender'] = gender;
  }
  if (phone) {
    data['phone'] = phone;
  }
  if (addresses) {
    data['addresses'] = JSON.parse(addresses);
  }
  if (dob) {
    data['dob'] = dob;
  }
  if (walletAddress) {
    data['walletAddress'] = walletAddress;
  }
  if (req.file !== undefined) {
    const { destination, filename } = req.file;

    const image = CreateImageUrl(destination, filename);
    data['photo'] = image;
    const IsImageExist = await collection.findOne({_id: ObjectId.createFromHexString(userId)});
    if (IsImageExist.photo) {
      const path = GetImagePath(IsImageExist.photo);
      if (fs.existsSync(path)) {
        fs.unlinkSync(path);
      }
    }
  }

  if (Object.keys(data).length > 0 || req.file !== undefined) {

    const user = await collection.findOneAndUpdate(
      { _id: ObjectId.createFromHexString(userId) },
      { $set: data }, 
      { returnDocument: 'after' }
    );

    if (!user) {
      return res.status(404).send({ error: 'User Not Found' });
    }

    res.status(200).json({
      message: 'Account Updated successfully.',
      user: user,
    });
  } else {
    return res
      .status(422)
      .json({ error: 'Kindly, Provide an valid attribute to update.' });
  }
};

// Updating two factor authentification = mv8
export const UpdateAuthentication = async (req, res) => {

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ error: errors.array() });
  }

  const { userId } = req.decoded;
  const { activated } = req.body;

  const user = await collection.findOneAndUpdate(
    {_id: ObjectId.createFromHexString(userId)},
    { $set: { twofactorauth: activated } },
    { returnDocument: 'after' }
  );

  if (!user) {
    return res.status(404).send({ error: 'User Not Found' });
  }

  res.status(200).json({
    message: 'Authentication Updated successfully.',
    user: user,
  });
};

// Activating user account = mv8
export const ChangeStatus = async (req, res) => {

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ error: errors.array() });
  }

  const { userId } = req.decoded;
  const { status } = req.body;

  const user = await collection.findOneAndUpdate(
    {_id: ObjectId.createFromHexString(userId)},
    { $set: { activated: status } },
    { returnDocument: 'after'}
  );

  if (!user) {
    return res.status(404).send({ error: 'User Not Found' });
  }

  res.status(200).json({
    message: 'Status Changed successfully.',
    user: user,
  });
};

// Changing user password = mv8
export const ChangePassword = async (req, res) => {

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ error: errors.array() });
  }

  const { userId } = req.decoded;
  const { currentPassword, newPassword } = req.body;

  const user = await collection.findOne({_id: ObjectId.createFromHexString(userId)});

  if (!user) {
    return res.status(404).send({ error: 'User Not Found' });
  }

  bcrypt.compare(currentPassword, user.password, (err, result) => {
    
    // wrong current password
    if (err) {
      res.status(500).send({ error: err.message });
      return;
    }

    if (result) {

      bcrypt.genSalt(10, (err, salt) => {
        if (err) {
          res.status(500).send({ error: err });
        }

        bcrypt.hash(newPassword, salt, async (err, hash) => {
          if (err) {
            res.status(500).send({ error: err });
          }

          const updatedUser = await collection.findOneAndUpdate(
            {_id: ObjectId.createFromHexString(userId)},
            { $set: { password: hash } },
            { returnDocument: true }
          );

          if (!updatedUser) {
            return res.status(404).send({ error: 'User Not Found' });
          }

          res.status(200).json({
            message: 'Password Changed successfully.',
            user: updatedUser,
          });
        });
      });
    } else {
      res.status(401).send({ error: 'Password did not matched' });
    }    
  });
};

// Adding new user address = mv8
export const AddAddress = async (req, res) => {

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ error: errors.array() });
  }

  const { userId } = req.decoded;

  const {
    address,
    street,
    postalCode,
    city,
    state,
    country,
  } = req.body;

  const data = {};

  if (address) {
    data['address'] = address;
  }
  if (street) {
    data['street'] = street;
  }
  if (postalCode) {
    data['postalCode'] = postalCode;
  }
  if (city) {
    data['city'] = city;
  }
  if (state) {
    data['state'] = state;
  }
  if (country) {
    data['country'] = country;
  }

  const user = await collection.findOne({_id: ObjectId.createFromHexString(userId)});

  if (!user) {
    return res.status(404).send({ error: 'User Not Found' });
  }

  user.addresses.push(data);

  const updatedUser = await collection.findOneAndUpdate(
    { _id: ObjectId.createFromHexString(userId) },
    { $set: { addresses: user.addresses } },
    { returnDocument: 'after' }
  );

  if (!updatedUser) {
    return res.status(404).send({ error: 'User Not Found' });
  }

  res.status(200).json({
    message: 'Address Added successfully.',
    user: updatedUser,
  });
};

// Removing user address = mv8
export const RemoveAddress = async (req, res) => {

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ error: errors.array() });
  }

  const { userId } = req.decoded;
  const { addressId } = req.body;

  const user = await collection.findOne({_id: ObjectId.createFromHexString(userId)});

  if (!user) {
    return res.status(404).send({ error: 'User Not Found' });
  }

  // Check if the index is valid
  if (addressId < 0 || addressId >= user.addresses.length) {
    return res.status(404).send({ error: 'Address Not Found' });
  }

  // Create a new array without the address at the given index
  const modifiedAddresses = user.addresses.filter((_, index) => index !== addressId);
  
  const updatedUser = await collection.findOneAndUpdate(
    { _id: ObjectId.createFromHexString(userId) },
    { $set: {addresses: modifiedAddresses} },
    { returnDocument: 'after' }
  );

  if (!updatedUser) {
    return res.status(404).send({ error: 'User Not Found' });
  }

  res.status(200).json({
    message: 'Address Removed successfully.',
    user: updatedUser,
  });
};

// Editing user address = mv8
export const EditAddress = async (req, res) => {

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ error: errors.array() });
  }

  const { userId } = req.decoded;
  const { addressId, address, street, postalCode, city, state, country } = req.body;

  const user = await collection.findOne({_id: ObjectId.createFromHexString(userId)});

  if (!user) {
    return res.status(404).send({ error: 'User Not Found' });
  }

  // Check if the index is valid
  if ( addressId < 0 || addressId >= user.addresses.length ) {
    return res.status(404).send({ error: 'Address Not Found' });
  }

  // Construct the new address object
  const data = {
    address,
    street,
    postalCode,
    city,
    state,
    country
  };

  // Update the address at the specified index
  user.addresses[addressId] = { ...user.addresses[addressId], ...data }; 

  /*
  let isAddressNotFound = true;
  let modifiedAddresses = [];

  user.addresses.map((item) => {
    if (item._id.equals(mongoose.Types.ObjectId(addressId))) {
      isAddressNotFound = false;
      const modifiedAddress = {
        _id: item._id,
        address: address ? address : item.address,
        street: street ? street : item.street,
        postalCode: postalCode ? postalCode : item.postalCode,
        city: city ? city : item.city,
        state: state ? state : item.state,
        country: country ? country : item.country,
        activated: true,
      };
      modifiedAddresses.push(modifiedAddress);
    } else {
      modifiedAddresses.push(item);
    }
  });

  if (isAddressNotFound === true) {
    return res.status(404).send({ error: 'Address Not Found' });
  }
  */

  const updatedUser = await collection.findOneAndUpdate(
    { _id: ObjectId.createFromHexString(userId) },
    { $set: { addresses: user.addresses } },
    { returnDocument: 'after' }
  );

  if (!updatedUser) {
    return res.status(404).send({ error: 'User Not Found' });
  }

  res.status(200).json({
    message: 'Address Updated successfully.',
    user: updatedUser,
  });
};