---
layout: notes
<<<<<<< HEAD
pagination:
  enabled: true
=======
>>>>>>> 4048321 (initial)
---

<div class="post-list">
{% for post in site.posts %}
<<<<<<< HEAD
      <div class="note-content">{{ post.content | strip }}
      <!-- <div class="note-meta"> -->
        <!-- <span class="note-date">{{ post.date | date: "%y%m%d" }}</span>
        {% if post.source %}
          <span class="note-source">
            {{ post.source }}
          </span>
        {% endif %} -->
        </div>
      <!-- </div> -->xy
=======
  {% if post.categories contains "note" or post.categories contains "quote" %}
    <div class="post-item {% if post.categories contains 'quote' %}quote-item{% endif %}">
      {{ post.content }}
      <div class="note-date">{{ post.date | date: "%y%m%d" }}</div>
      {% if post.categories contains 'quote' and post.source %}
        <div class="quote-source">
          <a href="{{ post.source }}" target="_blank">Source ↗</a>
        </div>
      {% endif %}
    </div>
  {% endif %}
>>>>>>> 4048321 (initial)
{% endfor %}
</div> 