import { poems } from './poems.js';
import { listContainer, poem_description, wrap, poemcounter, input, category } from './data.js';
import { updatePoems } from "./pagenation.js";

console.log('loaded main');

updatePoems();  


export function render(list) {
  if (!listContainer) {
    console.error('listContainer not found');
    return;
  }
  
  listContainer.innerHTML = ""; // 🔥 clear first (important for performance)

  list.forEach(poem => {
    const div = document.createElement("div");
    div.className = "poem-card";

    div.innerHTML = `
      <span class="poem-category">${poem.tag}</span>

      <img src="images/unified-header.jpeg" alt="${poem.title}" loading="lazy">

      <div class="poem-card-content">
        <h2 class="poem-title">${poem.title}</h2>
        ${poem.description ? `<p class="poem-description">${poem.description}</p>` : ""}
        
        <a href="/poem.html?id=${poem.id}" class="poem-card-read">Read →</a>
      </div>
    `;

    listContainer.appendChild(div);
  });

  if (poemcounter) {
    poemcounter.textContent = poems.length;
  }
}



function render_disclamer() {
  // If already shown in this session, don't show again
  if (sessionStorage.getItem("disclaimerShown")) {
    return;
  }

  const disclamer = document.createElement('div');
  disclamer.className = 'disclamer';

  disclamer.innerHTML = `
    <div class="disclamer-box">
      <span>DISCLAIMER</span>

      <p>This poem collection is based on the writer's experiences and emotions. It is not intended to hurt or target any person.</p>
      <p>In the poems, 'she' is an imaginary figure created to express feelings or fill emotional gaps.</p>
      <p>'She' may also represent people in general, not any specific individual.</p>

      <span> CLICK ON READ BUTTON TO READ POEMS</span>
    </div>
  `;

  document.body.appendChild(disclamer);

  // Show
  disclamer.classList.add("show");

  // Mark as shown for this session
  sessionStorage.setItem("disclaimerShown", "true");

  // Hide after 6 seconds
  setTimeout(() => {
    disclamer.classList.remove("show");
    // Remove from DOM after animation
    setTimeout(() => {
      if (disclamer.parentNode) {
        disclamer.parentNode.removeChild(disclamer);
      }
    }, 300);
  }, 6000);
}

render_disclamer();

export function searchfilter() {
  if (!input || !category) {
    console.error('Input or category elements not found');
    return poems;
  }
  
  const search = input.value.toLowerCase().trim();
  const selectedCategory = category.value.toLowerCase();

  // Filter by category
  let filteredPoems = poems;
  
  if (selectedCategory !== 'all') {
    filteredPoems = filteredPoems.filter(poem => 
      poem.tag && poem.tag.toLowerCase() === selectedCategory
    );
  }

  // Then filter by search term if provided
  if (search !== '') {
    filteredPoems = filteredPoems.filter(poem => {
      // Search in title
      const matchesTitle = poem.title && poem.title.toLowerCase().includes(search);
      
      // Search in description if exists
      const matchesDescription = poem.description && 
                                 poem.description.toLowerCase().includes(search);
      
      // Search in tag
      const matchesTag = poem.tag && poem.tag.toLowerCase().includes(search);
      
      return matchesTitle || matchesDescription || matchesTag;
    });
  }

  return filteredPoems;
}

// Add event listeners for search and category changes
function setupEventListeners() {
  if (input) {
    input.addEventListener('input', () => {
      updatePoems();
    });
  }

  if (category) {
    category.addEventListener('change', () => {
      updatePoems();
    });
  }
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  
  // Also handle the navigation dropdown toggle
  const navToggle = document.getElementById('navToggle');
  const navDropdown = document.getElementById('navDropdown');
  
  if (navToggle && navDropdown) {
    navToggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      navDropdown.classList.toggle('active');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!navDropdown.contains(e.target)) {
        navDropdown.classList.remove('active');
      }
    });
  }
});

// Also setup event listeners if elements are already available
// (for cases where DOM might already be loaded)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupEventListeners);
} else {
  setupEventListeners();
}

