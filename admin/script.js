document.addEventListener('DOMContentLoaded', () => {

    const productForm = document.getElementById('product-form');
    const formTitle = document.getElementById('form-title');
    const formSubmitBtn = document.getElementById('form-submit-btn');
    const formCancelBtn = document.getElementById('form-cancel-btn');
    const productIdInput = document.getElementById('product-id');
    const productNameInput = document.getElementById('product-name');
    const productPriceInput = document.getElementById('product-price');
    const productCategoryInput = document.getElementById('product-category');
    const productImgInput = document.getElementById('product-img');
    const productDescriptionInput = document.getElementById('product-description');
    const productTableBody = document.getElementById('product-table-body');

    const blogForm = document.getElementById('blog-form');
    const blogIdInput = document.getElementById('blog-id');
    const blogTitleInput = document.getElementById('blog-title');
    const blogAuthorInput = document.getElementById('blog-author');
    const blogImgInput = document.getElementById('blog-image');
    const blogTableBody = document.getElementById('blog-table-body');
    const publishFacebookBtn = document.getElementById('publish-facebook-btn');

    let quill;
    if (document.getElementById('editor')) {
        quill = new Quill('#editor', {
            theme: 'snow'
        });
    }

    const API_URL = 'http://localhost:3000';
    const LOGIN_API_URL = `${API_URL}/api/login`;
    const PRODUCTS_API_URL = `${API_URL}/api/products`;
    const BLOGS_API_URL = `${API_URL}/api/blogs`;
    const UPLOAD_API_URL = `${API_URL}/api/upload-image`;
    const PUBLISH_API_URL = `${API_URL}/api/publish-social-media`;
    const ANALYTICS_API_URL = `${API_URL}/api/analytics`;

    const checkAuthentication = () => {
        const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
        const isLoginPage = window.location.pathname.includes('/admin/login.html');

        if (!isAuthenticated && !isLoginPage) {
            window.location.href = 'login.html';
        }
    };

    const handleAdminLogin = () => {
        const loginForm = document.getElementById('admin-login-form');
        if (!loginForm) return;

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch(LOGIN_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem('isAuthenticated', 'true');
                    localStorage.setItem('token', data.token);

                    const toastLiveExample = document.getElementById('liveToast');
                    if (toastLiveExample) {
                        const toast = new bootstrap.Toast(toastLiveExample);
                        toast.show();
                    }
                    
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 2000);
                } else {
                    alert(data.message);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred during login. Please try again.');
            }
        });
    };

    const handleLogout = () => {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('isAuthenticated');
                localStorage.removeItem('token');
                window.location.href = 'login.html';
            });
        }
    };

    const fetchAnalytics = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch(ANALYTICS_API_URL, {
                headers: { 'x-api-key': token }
            });
            if (response.ok) {
                const data = await response.json();
                document.getElementById('total-products').textContent = data.totalProducts;
                document.getElementById('total-blogs').textContent = data.totalBlogs;
                document.getElementById('most-popular-product').textContent = data.mostPopularProduct.name;
                document.getElementById('top-blogger').textContent = data.recentBloggers[0];
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
        }
    };

    const handleProductManagement = () => {
        if (!productTableBody) return;

        const API_KEY = localStorage.getItem('token');
        if (!API_KEY) {
            console.error('API key not found. Redirecting to login.');
            window.location.href = 'login.html';
            return;
        }

        const fetchProducts = async () => {
            try {
                const response = await fetch(PRODUCTS_API_URL, {
                    headers: { 'x-api-key': API_KEY }
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch products');
                }
                const products = await response.json();
                renderProducts(products);
            } catch (error) {
                console.error('Error fetching products:', error);
                productTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Failed to load products.</td></tr>';
            }
        };

        const renderProducts = (products) => {
            productTableBody.innerHTML = '';
            products.forEach(product => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${product.id}</td>
                    <td>${product.name}</td>
                    <td>${product.category}</td>
                    <td>₦${product.price.toLocaleString()}</td>
                    <td>
                        <input type="checkbox" class="form-check-input featured-toggle" data-id="${product.id}" ${product.featured ? 'checked' : ''}>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-primary edit-btn" data-id="${product.id}">Edit</button>
                        <button class="btn btn-sm btn-danger delete-btn" data-id="${product.id}">Delete</button>
                    </td>
                `;
                productTableBody.appendChild(row);
            });
        };

        const handleFormSubmit = async (event) => {
            event.preventDefault();

            const imageFile = document.getElementById('product-img').files[0];
            let imageUrl = '';
            if (imageFile) {
                imageUrl = await uploadImage(imageFile);
                if (!imageUrl) {
                    return;
                }
            }
            
            const product = {
                name: productNameInput.value,
                price: parseFloat(productPriceInput.value),
                category: productCategoryInput.value,
                img: imageUrl,
                description: productDescriptionInput.value,
                featured: false
            };

            const productId = productIdInput.value;
            const headers = {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY
            };

            try {
                let response;
                if (productId) {
                    response = await fetch(`${PRODUCTS_API_URL}/${productId}`, {
                        method: 'PUT',
                        headers: headers,
                        body: JSON.stringify(product)
                    });
                } else {
                    response = await fetch(PRODUCTS_API_URL, {
                        method: 'POST',
                        headers: headers,
                        body: JSON.stringify(product)
                    });
                }

                if (response.ok) {
                    alert(`Product ${productId ? 'updated' : 'added'} successfully!`);
                } else {
                    const errorData = await response.json();
                    alert(`Failed to ${productId ? 'update' : 'add'} product: ${errorData.message}`);
                }
                productForm.reset();
                resetForm();
                fetchProducts();
            } catch (error) {
                console.error('Error submitting form:', error);
                alert('An error occurred. Please try again.');
            }
        };

        const handleFeaturedToggle = async (id, isFeatured) => {
            const headers = {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY
            };
            try {
                const response = await fetch(`${PRODUCTS_API_URL}/${id}`, {
                    method: 'PUT',
                    headers: headers,
                    body: JSON.stringify({ featured: isFeatured })
                });
                if (!response.ok) {
                    throw new Error('Failed to update featured status');
                }
            } catch (error) {
                console.error('Error updating featured status:', error);
                alert('An error occurred while updating featured status.');
                fetchProducts(); // Revert to previous state on failure
            }
        };

        const handleEditClick = (id) => {
            fetch(`${PRODUCTS_API_URL}/${id}`, {
                headers: { 'x-api-key': API_KEY }
            })
                .then(res => res.json())
                .then(product => {
                    productIdInput.value = product.id;
                    productNameInput.value = product.name;
                    productPriceInput.value = product.price;
                    productCategoryInput.value = product.category;
                    productDescriptionInput.value = product.description;
                    document.getElementById('product-img').value = '';

                    formTitle.textContent = 'Edit Product';
                    formSubmitBtn.textContent = 'Update Product';
                    formCancelBtn.style.display = 'block';
                })
                .catch(error => console.error('Error fetching product for edit:', error));
        };

        const handleDeleteClick = async (id) => {
            if (confirm('Are you sure you want to delete this product?')) {
                const headers = {
                    'x-api-key': API_KEY
                };
                try {
                    const response = await fetch(`${PRODUCTS_API_URL}/${id}`, {
                        method: 'DELETE',
                        headers: headers
                    });
                    if (response.ok) {
                        alert('Product deleted successfully!');
                        fetchProducts();
                    } else {
                        const errorData = await response.json();
                        alert(`Failed to delete product: ${errorData.message}`);
                    }
                } catch (error) {
                    console.error('Error deleting product:', error);
                    alert('An error occurred. Please try again.');
                }
            }
        };

        const resetForm = () => {
            productForm.reset();
            productIdInput.value = '';
            formTitle.textContent = 'Add New Product';
            formSubmitBtn.textContent = 'Add Product';
            formCancelBtn.style.display = 'none';
        };

        productForm.addEventListener('submit', handleFormSubmit);
        if (formCancelBtn) {
            formCancelBtn.addEventListener('click', resetForm);
        }

        productTableBody.addEventListener('click', (event) => {
            const target = event.target;
            if (target.classList.contains('edit-btn')) {
                const id = target.dataset.id;
                handleEditClick(id);
            } else if (target.classList.contains('delete-btn')) {
                const id = target.dataset.id;
                handleDeleteClick(id);
            } else if (target.classList.contains('featured-toggle')) {
                const id = target.dataset.id;
                handleFeaturedToggle(id, target.checked);
            }
        });

        fetchProducts();
    };

    const handleBlogManagement = () => {
        if (!blogTableBody) return;

        const API_KEY = localStorage.getItem('token');
        if (!API_KEY) {
            console.error('API key not found. Redirecting to login.');
            window.location.href = 'login.html';
            return;
        }

        const fetchAllBlogs = async () => {
            try {
                const response = await fetch(BLOGS_API_URL, {
                    headers: { 'x-api-key': API_KEY }
                });
                const blogs = await response.json();
                renderBlogs(blogs);
            } catch (error) {
                console.error('Error fetching blogs:', error);
                blogTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Failed to load blogs.</td></tr>';
            }
        };

        const renderBlogs = (blogs) => {
            blogTableBody.innerHTML = '';
            blogs.forEach(blog => {
                const row = document.createElement('tr');
                const formattedDate = new Date(blog.timestamp).toLocaleDateString();
                row.innerHTML = `
                    <td>${blog.id}</td>
                    <td>${blog.title}</td>
                    <td>${blog.author}</td>
                    <td>${formattedDate}</td>
                    <td>
                        <input type="checkbox" class="form-check-input featured-toggle" data-id="${blog.id}" ${blog.featured ? 'checked' : ''}>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-primary edit-btn" data-id="${blog.id}">Edit</button>
                        <button class="btn btn-sm btn-danger delete-btn" data-id="${blog.id}">Delete</button>
                    </td>
                `;
                blogTableBody.appendChild(row);
            });
        };

        const handleFormSubmit = async (event) => {
            event.preventDefault();

            const imageFile = document.getElementById('blog-image').files[0];
            let imageUrl = '';
            if (imageFile) {
                imageUrl = await uploadImage(imageFile);
                if (!imageUrl) {
                    return;
                }
            }

            const blog = {
                title: blogTitleInput.value,
                author: blogAuthorInput.value,
                img: imageUrl,
                content: quill.root.innerHTML,
                category: document.getElementById('blog-category').value,
                featured: false
            };

            const blogId = blogIdInput.value;
            const headers = {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY
            };

            try {
                let response;
                if (blogId) {
                    response = await fetch(`${BLOGS_API_URL}/${blogId}`, {
                        method: 'PUT',
                        headers: headers,
                        body: JSON.stringify(blog)
                    });
                } else {
                    response = await fetch(BLOGS_API_URL, {
                        method: 'POST',
                        headers: headers,
                        body: JSON.stringify(blog)
                    });
                }

                if (response.ok) {
                    alert(`Blog post ${blogId ? 'updated' : 'added'} successfully!`);
                } else {
                    const errorData = await response.json();
                    alert(`Failed to ${blogId ? 'update' : 'add'} blog post: ${errorData.message}`);
                }
                blogForm.reset();
                resetForm();
                fetchAllBlogs();
            } catch (error) {
                console.error('Error submitting form:', error);
                alert('An error occurred. Please try again.');
            }
        };

        const handleFeaturedToggle = async (id, isFeatured) => {
            const headers = {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY
            };
            try {
                const response = await fetch(`${BLOGS_API_URL}/${id}`, {
                    method: 'PUT',
                    headers: headers,
                    body: JSON.stringify({ featured: isFeatured })
                });
                if (!response.ok) {
                    throw new Error('Failed to update featured status');
                }
            } catch (error) {
                console.error('Error updating featured status:', error);
                alert('An error occurred while updating featured status.');
                fetchAllBlogs(); // Revert to previous state on failure
            }
        };

        const handlePublishToFacebook = async () => {
            const blogId = blogIdInput.value;
            if (!blogId) {
                return alert('Please select a blog post to publish.');
            }

            const confirmed = confirm('Are you sure you want to publish this post to Facebook?');
            if (!confirmed) return;

            try {
                const response = await fetch(PUBLISH_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': localStorage.getItem('token')
                    },
                    body: JSON.stringify({
                        blogId: blogId,
                        socialMediaPlatform: 'facebook'
                    })
                });

                const data = await response.json();
                if (response.ok) {
                    alert(data.message);
                } else {
                    alert(data.message || 'Failed to publish post.');
                }
            } catch (error) {
                console.error('Error publishing to Facebook:', error);
                alert('An error occurred while publishing to Facebook.');
            }
        };
        
        const handleEditClick = (id) => {
            fetch(`${BLOGS_API_URL}/${id}`, {
                headers: { 'x-api-key': API_KEY }
            })
                .then(res => res.json())
                .then(blog => {
                    blogIdInput.value = blog.id;
                    blogTitleInput.value = blog.title;
                    blogAuthorInput.value = blog.author;
                    document.getElementById('blog-image').value = '';
                    quill.clipboard.dangerouslyPasteHTML(blog.content);

                    formTitle.textContent = 'Edit Blog Post';
                    formSubmitBtn.textContent = 'Update Blog Post';
                    formCancelBtn.style.display = 'block';
                    publishFacebookBtn.style.display = 'block';
                })
                .catch(error => console.error('Error fetching blog for edit:', error));
        };

        const handleDeleteClick = async (id) => {
            if (confirm('Are you sure you want to delete this blog post?')) {
                const headers = {
                    'x-api-key': API_KEY
                };
                try {
                    const response = await fetch(`${BLOGS_API_URL}/${id}`, {
                        method: 'DELETE',
                        headers: headers
                    });
                    if (response.ok) {
                        alert('Blog post deleted successfully!');
                        fetchAllBlogs();
                    } else {
                        const errorData = await response.json();
                        alert(`Failed to delete blog post: ${errorData.message}`);
                    }
                } catch (error) {
                    console.error('Error deleting blog post:', error);
                    alert('An error occurred. Please try again.');
                }
            }
        };

        const resetForm = () => {
            blogForm.reset();
            blogIdInput.value = '';
            quill.clipboard.dangerouslyPasteHTML('');
            formTitle.textContent = 'Add New Blog Post';
            formSubmitBtn.textContent = 'Add Blog Post';
            formCancelBtn.style.display = 'none';
            publishFacebookBtn.style.display = 'none';
        };

        blogForm.addEventListener('submit', handleFormSubmit);
        if (formCancelBtn) {
            formCancelBtn.addEventListener('click', resetForm);
        }
        if (publishFacebookBtn) {
            publishFacebookBtn.addEventListener('click', handlePublishToFacebook);
        }

        blogTableBody.addEventListener('click', (event) => {
            const target = event.target;
            if (target.classList.contains('edit-btn')) {
                const id = target.dataset.id;
                handleEditClick(id);
            } else if (target.classList.contains('delete-btn')) {
                const id = target.dataset.id;
                handleDeleteClick(id);
            } else if (target.classList.contains('featured-toggle')) {
                const id = target.dataset.id;
                handleFeaturedToggle(id, target.checked);
            }
        });

        fetchAllBlogs();
    };

    const initializeAdminPanel = () => {
        const path = window.location.pathname;
        const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

        if (path.includes('/admin/login.html')) {
            handleAdminLogin();
        } else {
            handleLogout();
            if (!isAuthenticated) {
                window.location.href = 'login.html';
            } else {
                if (path.includes('/admin/dashboard.html')) {
                    fetchAnalytics();
                } else if (path.includes('/admin/products.html')) {
                    handleProductManagement();
                } else if (path.includes('/admin/blogs.html')) {
                    handleBlogManagement();
                }
            }
        }
        const menuToggle = document.getElementById('menu-toggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', (e) => {
                e.preventDefault();
                const wrapper = document.getElementById('wrapper');
                if (wrapper) {
                    wrapper.classList.toggle('toggled');
                }
            });
        }
    };

    initializeAdminPanel();
});