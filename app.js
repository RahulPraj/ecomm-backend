const express = require('express');
const app = express();
const {User} = require('./model/User');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {Product} = require('./model/Product');
const {Cart} = require('./model/Cart');

//middleware
app.use(express.json());
app.use(cors());
app.use(morgan('dev'))

// GaWiZhoKVzkLa3Jq

let MONGODB_URL = "mongodb+srv://rahul971801:GaWiZhoKVzkLa3Jq@cluster0.pcbaw.mongodb.net/?retryWrites=true&w=majority"

mongoose.connect(MONGODB_URL)
.then(()=>{
    console.log("DB is connected")
}).catch((err)=>{
    console.log("db is not connectd",err)
})

//task-1 create route for register user
app.post('/register',async(req,res)=>{
    try{
        let {name,email,password} = req.body;

        if(!email || !password || !name){
            return res.status(400).json({message:"Some Fields are missing"})
        }
        
        //check if user exist or not
        const isUserAlreadyExist = await User.findOne({email});

        if(isUserAlreadyExist){
            return res.status(400).json({message:"User already registered"})
        }else{
            //hash the password
            const salt = bcrypt.genSaltSync(10);
            const hashedPassword = bcrypt.hashSync(password,salt);

            //generat token
            const token = jwt.sign({email},"supersecret", {expiresIn:'365d'})
            
            //create user
            await User.create({
                name,
                email,
                password:hashedPassword,
                token,
                role:'user'
            })

            return res.status(201).json({
                message: "User created successfully"
            })

        }

    }catch(error){
        console.log("Internal Server error",error);
    }
})


//task-2 create route for login user
app.post('/login', async(req,res)=>{
    try{
        let {email, password} = req.body;

        if(!email || !password){
            return res.status(400).json({
                message:"Some Fields are missing"
            })
        }
        //check user exist or not
        const user = await User.findOne({email});

        if(!user){
            return res.status(400).json({
                message:"User is not registered. Please register first"
            })
        }

        //compare the entered password 
        const isPasswordMatched = bcrypt.compareSync(password, user.password);

        if(!isPasswordMatched){
            return res.status(400).json({
                message:"Invalid password"
            })
        }

        //user logined successfully
        return res.status(200).json({
            id:user._id,
            name:user.name,
            token:user.token,
            email:user.email,
            role:user.role
        })

    }catch(error){
        console.log("Internal Server error",error);
    }
})


//task-3 create route to see all product
app.get('/products',async(req,res)=>{
    try{
        const products = await Product.find();
        res.status(200).json({
            message:"product found successfully",
            products:products
        })
    }catch(error){
        console.log(error);
        return res.status(500).json({message:"Internal server error"});
    }
})


//task-4 create route to add product
app.post('/add-product',async(req,res)=>{
    try{
        let {name, image, stock, price, description,brand} = req.body;
        let {token} = req.headers;
        let decodedtoken = jwt.verify(token, "supersecret");

        const user = await User.findOne({email:decodedtoken.email});

        const product = await Product.create({
            name,
            description,
            image,
            price,
            stock,
            brand,
            user:user._id

        })
        return res.status(201).json({
            message:"product created successfully",
            product:product
        })

    }catch(error){
        console.log(error);
        return res.status(500).json({message:"Internal server error"});
    }
})


//task-5 -> to show a particular product
app.get('/product/:id',async(req,res)=>{
    try{
        let {id} = req.params;

        if(!id){
            return res.status(400).json({
                message:"Product id not found"
            })
        }

        const {token} = req.headers;
        const decodedtoken = jwt.verify(token, "supersecret");

        if(decodedtoken.email){
            const product = await Product.findById(id);
            if(!product){
                return res.status(400).json({
                    message:"Product not found"
                })
            }
            return res.status(200).json({
                message:"Product found",
                product:product
            })
        }

    }catch(error){
        console.log(error);
        return res.status(500).json({message:"Internal server error"});
    }
})


//task6 -> to update a particular product
app.patch('/product/edit/:id',async(req,res)=>{
    try{
        let {name, description, image, price, brand, stock} = req.body.productData;
        let {id} = req.params;
        let {token} = req.headers;

        const decodedtoken = jwt.verify(token, "supersecret");

        if(decodedtoken.email){
            const updatedProduct = await Product.findByIdAndUpdate(id,{
                name,
                description,
                image,
                price,
                brand,
                stock,
            })
            return res.status(200).json({
                message:"Product updated successfully",
                product:updatedProduct
            })
        }

    }catch(error){
        console.log(error);
        return res.status(500).json({message:"Internal server error"});
    }
})


//task-7 to delete a product 
app.delete('/product/delete/:id',async(req,res)=>{
    try{
        const {id} = req.params;

        if(!id){
            return res.status(400).json({message:"Product Id not found"});
        }

        const deletedProduct = await Product.findByIdAndDelete(id);

        if(!deletedProduct){
            return res.status(404).json({message:'Product not Found'});
        }

        return res.status(200).json({
            message:"Product deleted successfully",
            product:deletedProduct
        })
    }catch(error){
        console.log(error);
        return res.status(500).json({message:"Internal server error"});
    }
})

//task-8 -> create a cart route
app.get('/cart',async(req,res)=>{
    try{
        const {token} = req.headers;
        const decodedtoken = jwt.verify(token, "supersecret");
        const user = await User.findOne({email:decodedtoken.email}).populate({
            path:'cart',
            populate:{
               path:'products',
               model:'Product' 
            }
        })
        if(!user){
            return res.status(400).json({message:"user not found"})
        }

        return res.status(200).json({cart:user.cart});

    }catch(error){
        console.log(error);
        return res.status(500).json({message:"Internal server error"});
    }
})

//task9 -> create a route to add product in cart
app.post('/cart/add',async(req,res)=>{
    try{
        const body = req.body;
        const productArray = body.products;
        let totalPrice = 0;

        //find the product and add product price in total

        for(const item of productArray){
            const product = await Product.findById(item)
            if(product){
                totalPrice += product.price;
            }
        }
        const {token} = req.headers;
        const decodedtoken = jwt.verify(token, "supersecret");
        const user = await User.findOne({email:decodedtoken.email});

        if(!user){
            return res.status(404).json({message:"user not found"});
        }

        //checking if user already has a cart
        let cart;
        if(user.cart){
            cart = await Cart.findById(user.cart).populate('products');

            const existingProductsIds =  cart.products.map((product)=>{
                product._id.toString()
            }) 

            //checking if product is exisitng or not if not just add the product
            //and add the total
            productArray.forEach(async(productId)=>{
                    if(!existingProductsIds.includes(productId)){
                        cart.products.push(productId);

                        const product = await Product.findById(productId);
                        totalPrice += product.price; 
                    }
            })

            //updated cart.total with the new total
            cart.total = totalPrice;
            await cart.save();

        }else{
            cart = new Cart({
                products: productArray,
                total : totalPrice
            })
           await cart.save();
           user.cart = cart._id;
           await user.save(); 
        }
        res.status(201).json({
            message:"cart updated successfully",
            cart:cart
        })

    }catch(error){
        console.log(error);
        return res.status(500).json({message:"Internal server error"});
    }
})


//task-10 -> delete the product from your cart
app.delete("/cart/product/delete", async (req, res) => {
    const { productID } = req.body;
    const { token } = req.headers;
  
    try {
      const decodedToken = jwt.verify(token, "supersecret");
      const user = await User.findOne({ email: decodedToken.email }).populate(
        "cart"
      );
  
      if (!user) {
        return res.status(404).json({ message: "User Not Found" });
      }
  
      const cart = await Cart.findById(user.cart).populate("products");
  
      if (!cart) {
        return res.status(404).json({ message: "Cart Not Found" });
      }
  
      const productIndex = cart.products.findIndex(
        (product) => product._id.toString() === productID
      );
  
      if (productIndex === -1) {
        return res.status(404).json({ message: "Product Not Found in Cart" });
      }
  
      cart.products.splice(productIndex, 1);
      cart.total = cart.products.reduce(
        (total, product) => total + product.price,
        0
      );
  
      await cart.save();
  
      res.status(200).json({
        message: "Product Removed from Cart Successfully",
        cart: cart,
      });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error Removing Product from Cart", error });
    }
  });

let PORT = 8080;
app.listen(PORT,()=>{
    console.log(`server is connected port: ${PORT}`)
})