---
# Feel free to add content and custom Front Matter to this file.
# To modify the layout, see https://jekyllrb.com/docs/themes/#overriding-theme-defaults

layout: default
title: Notes
---

<ul class="posts">
  {% for post in site.posts %}
    <li>
      <h2><a href="{{ post.url }}">{{ post.title }}</a></h2>
      {% if post.categories contains "Chat" %}<img src="{{ '/assets/images/chat-icon.svg' | relative_url }}" alt="Icon" style="height: 1em;">{% endif %}
      <time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: "%B %-d, %Y" }}</time>
    </li>
  {% endfor %}
</ul>