---
layout: notes
---

<div class="post-list">
{% for post in site.posts %}
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
{% endfor %}
</div> 