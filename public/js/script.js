document.addEventListener('DOMContentLoaded', () => {
    // This variable will be the base URL for all API calls.
    // Use an empty string for Vercel deployment, which will resolve to your domain.
    // For local testing, you can uncomment the localhost URL.
    const API_URL = '';
    // const API_URL = 'http://localhost:3000';

    // ======================================================================
    // Shared Functions (used by both admin and public sites)
    // ======================================================================

    const renderProducts = (products, containerId) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';
        if (products.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No products found.</p>';
            return;
        }

        container.innerHTML = products.map(product => `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100 product-card">
                    <img src="${product.img}" class="card-img-top" alt="${product.name}">
                    <div class="card-body">
                        <h5 class="card-title">${product.name}</h5>
                        <p class="card-text text-muted">${product.category}</p>
                        <p class="card-text fw-bold">₦${product.price.toLocaleString()}</p>
                    </div>
                </div>
            </div>
        `).join('');
    };

    const renderBlogs = (blogs, containerId) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';
        if (blogs.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No blog posts found.</p>';
            return;
        }

        container.innerHTML = blogs.map(blog => `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100 blog-card">
                    <img src="${blog.img}" class="card-img-top" alt="${blog.title}">
                    <div class="card-body">
                        <h5 class="card-title">${blog.title}</h5>
                        <p class="card-text text-muted">${new Date(blog.timestamp).toLocaleDateString()} by ${blog.author}</p>
                        <p class="card-text">${blog.content.replace(/<[^>]*>/g, '').substring(0, 100)}...</p>
                        <a href="blog-post.html?id=${blog.id}" class="btn btn-primary">Read More</a>
                    </div>
                </div>
            </div>
        `).join('');
    };

    const populateFilters = (data, filterId, prop, label) => {
        const filterEl = document.getElementById(filterId);
        if (!filterEl) return;
        
        const uniqueValues = new Set(data.map(item => item[prop]));
        filterEl.innerHTML = `<option value="">All ${label}</option>`;
        uniqueValues.forEach(value => {
            if (value) {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = value;
                filterEl.appendChild(option);
            }
        });
    };

    // ======================================================================
    // Admin Panel Functions
    // ======================================================================

    const LOGIN_API_URL = `${API_URL}/api/login`;
    const PRODUCTS_API_URL = `${API_URL}/api/products`;
    const BLOGS_API_URL = `${API_URL}/api/blogs`;
    const UPLOAD_API_URL = `${API_URL}/api/upload-image`;
    const PUBLISH_API_URL = `${API_URL}/api/publish-social-media`;
    const ANALYTICS_API_URL = `${API_URL}/api/analytics`;

    let quill;
    if (document.getElementById('editor')) {
        quill = new Quill('#editor', {
            theme: 'snow'
        });
    }

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
        const productTableBody = document.getElementById('product-table-body');
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
                renderProducts(products, 'product-table-body');
            } catch (error) {
                console.error('Error fetching products:', error);
                productTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Failed to load products.</td></tr>';
            }
        };

        const handleFormSubmit = async (event) => {
            event.preventDefault();

            const productForm = document.getElementById('product-form');
            const productIdInput = document.getElementById('product-id');
            const productNameInput = document.getElementById('product-name');
            const productPriceInput = document.getElementById('product-price');
            const productCategoryInput = document.getElementById('product-category');
            const productImgInput = document.getElementById('product-img');
            const productDescriptionInput = document.getElementById('product-description');
            const formSubmitBtn = document.getElementById('form-submit-btn');
            const formCancelBtn = document.getElementById('form-cancel-btn');
            const formTitle = document.getElementById('form-title');

            const imageFile = productImgInput.files[0];
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
                fetchProducts();
            }
        };

        const handleEditClick = (id) => {
            const productIdInput = document.getElementById('product-id');
            const productNameInput = document.getElementById('product-name');
            const productPriceInput = document.getElementById('product-price');
            const productCategoryInput = document.getElementById('product-category');
            const productDescriptionInput = document.getElementById('product-description');
            const formTitle = document.getElementById('form-title');
            const formSubmitBtn = document.getElementById('form-submit-btn');
            const formCancelBtn = document.getElementById('form-cancel-btn');

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
                const headers = { 'x-api-key': API_KEY };
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
            const productForm = document.getElementById('product-form');
            const productIdInput = document.getElementById('product-id');
            const formTitle = document.getElementById('form-title');
            const formSubmitBtn = document.getElementById('form-submit-btn');
            const formCancelBtn = document.getElementById('form-cancel-btn');
            productForm.reset();
            productIdInput.value = '';
            formTitle.textContent = 'Add New Product';
            formSubmitBtn.textContent = 'Add Product';
            formCancelBtn.style.display = 'none';
        };

        const productForm = document.getElementById('product-form');
        const formCancelBtn = document.getElementById('form-cancel-btn');
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
        const blogTableBody = document.getElementById('blog-table-body');
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
                renderBlogs(blogs, 'blog-table-body');
            } catch (error) {
                console.error('Error fetching blogs:', error);
                blogTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Failed to load blogs.</td></tr>';
            }
        };

        const handleFormSubmit = async (event) => {
            event.preventDefault();
            
            const blogForm = document.getElementById('blog-form');
            const blogIdInput = document.getElementById('blog-id');
            const blogTitleInput = document.getElementById('blog-title');
            const blogAuthorInput = document.getElementById('blog-author');
            const blogImgInput = document.getElementById('blog-image');
            const formSubmitBtn = document.getElementById('form-submit-btn');
            const formCancelBtn = document.getElementById('form-cancel-btn');
            const publishFacebookBtn = document.getElementById('publish-facebook-btn');
            const formTitle = document.getElementById('form-title');

            const imageFile = blogImgInput.files[0];
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
                fetchAllBlogs();
            }
        };

        const handlePublishToFacebook = async () => {
            const blogId = document.getElementById('blog-id').value;
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
            const blogIdInput = document.getElementById('blog-id');
            const blogTitleInput = document.getElementById('blog-title');
            const blogAuthorInput = document.getElementById('blog-author');
            const formTitle = document.getElementById('form-title');
            const formSubmitBtn = document.getElementById('form-submit-btn');
            const formCancelBtn = document.getElementById('form-cancel-btn');
            const publishFacebookBtn = document.getElementById('publish-facebook-btn');

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
                const headers = { 'x-api-key': API_KEY };
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
            const blogForm = document.getElementById('blog-form');
            const blogIdInput = document.getElementById('blog-id');
            const formTitle = document.getElementById('form-title');
            const formSubmitBtn = document.getElementById('form-submit-btn');
            const formCancelBtn = document.getElementById('form-cancel-btn');
            const publishFacebookBtn = document.getElementById('publish-facebook-btn');

            blogForm.reset();
            blogIdInput.value = '';
            quill.clipboard.dangerouslyPasteHTML('');
            formTitle.textContent = 'Add New Blog Post';
            formSubmitBtn.textContent = 'Add Blog Post';
            formCancelBtn.style.display = 'none';
            publishFacebookBtn.style.display = 'none';
        };

        const blogForm = document.getElementById('blog-form');
        const formCancelBtn = document.getElementById('form-cancel-btn');
        const publishFacebookBtn = document.getElementById('publish-facebook-btn');
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

    // ======================================================================
    // Public Site Functions
    // ======================================================================

    const initializePublicSite = async () => {
        const path = window.location.pathname;

        if (path.includes('index.html') || path === '/') {
            try {
                const productsResponse = await fetch(`${API_URL}/api/products`);
                const products = await productsResponse.json();
                const featuredProducts = products.filter(p => p.featured);
                renderProducts(featuredProducts, 'featured-products-container');
            } catch (error) {
                console.error('Error fetching featured products:', error);
            }

            try {
                const blogsResponse = await fetch(`${API_URL}/api/blogs`);
                const blogs = await blogsResponse.json();
                const featuredBlogs = blogs.filter(b => b.featured);
                renderBlogs(featuredBlogs, 'featured-blogs-container');
            } catch (error) {
                console.error('Error fetching featured blogs:', error);
            }
        } else if (path.includes('products.html')) {
            const productSearch = document.getElementById('productSearch');
            const categoryFilter = document.getElementById('productCategory');
            
            let allProducts = [];

            const fetchAndRender = async () => {
                try {
                    const response = await fetch(`${API_URL}/api/products`);
                    allProducts = await response.json();
                    
                    populateFilters(allProducts, 'productCategory', 'category', 'Categories');

                    filterAndSortProducts();
                } catch (error) {
                    console.error('Error fetching products:', error);
                }
            };

            const filterAndSortProducts = () => {
                let filteredProducts = [...allProducts];

                const searchTerm = productSearch.value.toLowerCase();
                if (searchTerm) {
                    filteredProducts = filteredProducts.filter(p => 
                        p.name.toLowerCase().includes(searchTerm) || 
                        (p.description && p.description.toLowerCase().includes(searchTerm))
                    );
                }

                const category = categoryFilter.value;
                if (category) {
                    filteredProducts = filteredProducts.filter(p => p.category === category);
                }

                renderProducts(filteredProducts, 'products-container');
            };

            productSearch.addEventListener('input', filterAndSortProducts);
            categoryFilter.addEventListener('change', filterAndSortProducts);

            fetchAndRender();
        } else if (path.includes('blogs.html')) {
            const categoryFilter = document.getElementById('blogCategory');
            const blogSearch = document.getElementById('blogSearch');

            let allBlogs = [];

            const fetchAndRender = async () => {
                try {
                    const response = await fetch(`${API_URL}/api/blogs`);
                    allBlogs = await response.json();
                    
                    populateFilters(allBlogs, 'blogCategory', 'category', 'Categories');

                    filterBlogs();
                } catch (error) {
                    console.error('Error fetching blogs:', error);
                }
            };

            const filterBlogs = () => {
                let filteredBlogs = [...allBlogs];
                
                const searchTerm = blogSearch.value.toLowerCase();
                if (searchTerm) {
                    filteredBlogs = filteredBlogs.filter(b =>
                        b.title.toLowerCase().includes(searchTerm) ||
                        (b.content && b.content.toLowerCase().includes(searchTerm))
                    );
                }

                const category = categoryFilter.value;
                if (category) {
                    filteredBlogs = filteredBlogs.filter(b => b.category === category);
                }
                
                renderBlogs(filteredBlogs, 'blogs-container');
            };

            categoryFilter.addEventListener('change', filterBlogs);
            blogSearch.addEventListener('input', filterBlogs);
            
            fetchAndRender();
        } else if (path.includes('blog-post.html')) {
            const urlParams = new URLSearchParams(window.location.search);
            const blogId = urlParams.get('id');

            if (blogId) {
                try {
                    const response = await fetch(`${API_URL}/api/blogs/${blogId}`);
                    const blogPost = await response.json();
                    
                    if (blogPost) {
                        const container = document.getElementById('blog-post-content');
                        document.title = `${blogPost.title} - Blog Post`;
                        container.innerHTML = `
                            <img src="${blogPost.img}" class="img-fluid mb-4 blog-post-image" alt="${blogPost.title}">
                            <h1 class="mb-3">${blogPost.title}</h1>
                            <p class="text-muted fst-italic">By ${blogPost.author} on ${new Date(blogPost.timestamp).toLocaleDateString()}</p>
                            <div class="blog-content">${blogPost.content}</div>
                        `;
                    } else {
                        document.getElementById('blog-post-content').innerHTML = '<p class="text-center text-danger">Blog post not found.</p>';
                    }
                } catch (error) {
                    console.error('Error fetching single blog post:', error);
                    document.getElementById('blog-post-content').innerHTML = '<p class="text-center text-danger">Failed to load blog post.</p>';
                }
            } else {
                document.getElementById('blog-post-content').innerHTML = '<p class="text-center text-danger">Invalid blog post ID.</p>';
            }
        }
    };

    // ======================================================================
    // Master Initialization Function
    // ======================================================================

    const initializeApp = () => {
        const path = window.location.pathname;
        if (path.includes('/admin/')) {
            checkAuthentication();
            handleAdminLogin();
            handleLogout();
            if (path.includes('/admin/dashboard.html')) {
                fetchAnalytics();
            } else if (path.includes('/admin/products.html')) {
                handleProductManagement();
            } else if (path.includes('/admin/blogs.html')) {
                handleBlogManagement();
            }
        } else {
            initializePublicSite();
        }

        // Add event listeners for the menu toggle in the admin panel, if it exists
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

    initializeApp();
});